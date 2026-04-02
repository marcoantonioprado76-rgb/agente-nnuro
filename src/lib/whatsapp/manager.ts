import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
  WAMessage,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import QRCode from 'qrcode'
import pino from 'pino'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createUserNotification } from '@/lib/notifications'
import { generateBotResponse, transcribeAudio } from './ai-engine'

const logger = pino({ level: 'info' })

// ═══ INSTANCE LOCK: Evitar que múltiples instancias del servidor compitan ═══
// Cada instancia genera un ID único. Solo la instancia "líder" puede reconectar bots.
const INSTANCE_ID = crypto.randomUUID()
console.log(`[WA Manager] 🆔 Instance ID: ${INSTANCE_ID}`)

// Directory to persist auth sessions
// Priority: WHATSAPP_SESSIONS_DIR env (Railway volume) > /tmp (Vercel) > local
const SESSIONS_DIR = process.env.WHATSAPP_SESSIONS_DIR
  || (process.env.VERCEL ? path.join('/tmp', '.whatsapp-sessions')
     : path.join(process.cwd(), '.whatsapp-sessions'))

// Buffer config: tiempo de espera para agrupar mensajes (en ms)
const MESSAGE_BUFFER_TIMEOUT = 10_000 // 10 segundos

// Tiempos de simulacion humana (en ms)
const DELAY_BEFORE_READ = 10_000       // 10s antes de marcar como leido
const DELAY_BEFORE_TYPING_MIN = 5_000  // 5-10s antes de empezar a escribir
const DELAY_BEFORE_TYPING_MAX = 10_000
const TYPING_DURATION_MIN = 5_000      // 5-8s simulando escritura
const TYPING_DURATION_MAX = 8_000
// Delays entre mensajes multiples (message2, message3)
const DELAY_BETWEEN_MSGS_MIN = 3_000   // 3-5s entre mensajes
const DELAY_BETWEEN_MSGS_MAX = 5_000
const TYPING_BETWEEN_MSGS_MIN = 3_000  // 3-6s escribiendo entre mensajes
const TYPING_BETWEEN_MSGS_MAX = 6_000

export interface WASessionState {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
  qrCode: string | null       // base64 data URL of QR
  qrRaw: string | null        // raw QR string from Baileys
  phoneNumber: string | null
  lastConnectedAt: string | null
}

interface ManagedSession {
  socket: WASocket | null
  state: WASessionState
  retryCount: number
  /** Timestamp de la última conexión exitosa (para detectar conexiones inestables) */
  lastOpenedAt: number
  /** Contador de conexiones inestables (se abrió y cerró rápido) */
  unstableCount: number
}

/** Buffer de mensajes por conversacion */
interface MessageBuffer {
  botId: string
  contactPhone: string
  contactName: string
  remoteJid: string  // JID completo original (puede ser @lid o @s.whatsapp.net)
  messages: Array<{
    content: string
    type: 'text' | 'audio' | 'image'
    timestamp: number
    baileysId: string  // ID real del mensaje de Baileys (para read receipts)
  }>
  timer: ReturnType<typeof setTimeout> | null
  conversationId: string | null
  contactId: string | null
}

// Intervalo del health check (30 segundos)
const HEALTH_CHECK_INTERVAL = 30_000

/**
 * Backup de credenciales Baileys a Supabase (JSONB)
 * Guarda creds.json + todos los archivos de signal keys
 */
async function backupCredentialsToDb(botId: string): Promise<void> {
  const sessionDir = path.join(SESSIONS_DIR, botId)
  if (!fs.existsSync(sessionDir)) return

  try {
    const files: Record<string, string> = {}
    const entries = fs.readdirSync(sessionDir)
    for (const entry of entries) {
      const filePath = path.join(sessionDir, entry)
      const stat = fs.statSync(filePath)
      if (stat.isFile() && entry.endsWith('.json')) {
        files[entry] = fs.readFileSync(filePath, 'utf-8')
      }
    }

    if (Object.keys(files).length === 0) return

    const supabase = await createServiceRoleClient()
    await supabase
      .from('whatsapp_sessions')
      .update({ credentials_backup: files })
      .eq('bot_id', botId)

    console.log(`[WA ${botId}] 💾 Credenciales respaldadas en DB (${Object.keys(files).length} archivos)`)
  } catch (err) {
    console.error(`[WA ${botId}] Error respaldando credenciales:`, err)
  }
}

/**
 * Restaurar credenciales desde Supabase al filesystem
 * Se usa cuando el contenedor se reinicia y pierde los archivos locales
 */
async function restoreCredentialsFromDb(botId: string): Promise<boolean> {
  const sessionDir = path.join(SESSIONS_DIR, botId)

  // Si ya existen credenciales locales, no restaurar
  if (fs.existsSync(path.join(sessionDir, 'creds.json'))) return true

  try {
    const supabase = await createServiceRoleClient()
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('credentials_backup')
      .eq('bot_id', botId)
      .single()

    if (!data?.credentials_backup || typeof data.credentials_backup !== 'object') {
      return false
    }

    const files = data.credentials_backup as Record<string, string>
    if (!files['creds.json']) return false

    // Crear directorio si no existe
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true })
    }

    // Escribir todos los archivos
    let count = 0
    for (const [fileName, content] of Object.entries(files)) {
      if (typeof content === 'string') {
        fs.writeFileSync(path.join(sessionDir, fileName), content, 'utf-8')
        count++
      }
    }

    console.log(`[WA ${botId}] 📥 Credenciales restauradas desde DB (${count} archivos)`)
    return count > 0
  } catch (err) {
    console.error(`[WA ${botId}] Error restaurando credenciales desde DB:`, err)
    return false
  }
}

class WhatsAppManager {
  private sessions: Map<string, ManagedSession> = new Map()
  /** Buffers activos: key = `${botId}:${contactPhone}` */
  private messageBuffers: Map<string, MessageBuffer> = new Map()
  /** Lock para evitar procesamiento concurrente del mismo buffer */
  private processingBuffers: Set<string> = new Set()
  /** Mapeo LID → numero real de WhatsApp (ej: "175432385220618" → "59167534487") */
  private lidToPhone: Map<string, string> = new Map()
  private static readonly MAX_LID_MAP_SIZE = 5000
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  /** Timestamp de la última reconexión por bot (evitar reconexiones simultáneas) */
  private lastReconnectAttempt: Map<string, number> = new Map()
  /** Mínimo tiempo entre intentos de reconexión (60 segundos) */
  private static readonly MIN_RECONNECT_INTERVAL = 60_000
  /** Lock del health check: true mientras se ejecuta */
  private healthCheckRunning = false

  constructor() {
    // Iniciar health check periodico
    this.healthCheckTimer = setInterval(() => {
      this.healthCheck()
    }, HEALTH_CHECK_INTERVAL)
  }

  /**
   * Verifica si es seguro intentar reconectar un bot (debounce).
   * Retorna false si ya se intentó reconectar recientemente.
   */
  private canAttemptReconnect(botId: string): boolean {
    const lastAttempt = this.lastReconnectAttempt.get(botId) || 0
    const elapsed = Date.now() - lastAttempt
    if (elapsed < WhatsAppManager.MIN_RECONNECT_INTERVAL) {
      return false
    }
    this.lastReconnectAttempt.set(botId, Date.now())
    return true
  }

  /**
   * Health check: detecta WebSockets muertos y reconecta.
   * CONSERVADOR: No reconecta si ya se intentó recientemente.
   * No descubre sesiones en DB que no están en memoria (eso lo hace restoreConnectedSessions al arrancar).
   */
  private async healthCheck(): Promise<void> {
    // Evitar ejecución concurrente del health check
    if (this.healthCheckRunning) return
    this.healthCheckRunning = true

    try {
    // ── Caso 1: Revisar sesiones en memoria ──
    for (const [botId, session] of this.sessions) {
      // Bot desconectado con credenciales → intentar reconectar (con debounce)
      if (session.state.status === 'disconnected' && !session.socket) {
        if (!this.canAttemptReconnect(botId)) continue

        const sessionDir = path.join(SESSIONS_DIR, botId)
        let hasCreds = fs.existsSync(path.join(sessionDir, 'creds.json'))

        if (!hasCreds) {
          const restored = await restoreCredentialsFromDb(botId)
          if (restored) {
            hasCreds = true
            console.log(`[WA ${botId}] 🔄 HEALTH CHECK: Credenciales restauradas desde DB`)
          }
        }

        if (hasCreds) {
          console.log(`[WA ${botId}] 🔄 HEALTH CHECK: Bot desconectado con credenciales, reconectando... (instance=${INSTANCE_ID.substring(0, 8)})`)
          session.state.status = 'connecting'
          session.retryCount = 0
          try {
            await this.initSocket(botId, false)
          } catch (err) {
            console.error(`[WA ${botId}] ❌ Error reconectando en health check:`, err)
            session.state.status = 'disconnected'
          }
        }
        continue
      }

      // Bot "connecting" pero sin socket → podría estar atascado
      if (session.state.status === 'connecting' && !session.socket) {
        // No hacer nada - la reconexión automática ya está en curso via setTimeout
        continue
      }

      // Bot "connected" → verificar si el WebSocket sigue vivo
      if (session.state.status !== 'connected' || !session.socket) continue

      // Verificar estado del WebSocket usando sendPresenceUpdate como "ping"
      try {
        await session.socket.sendPresenceUpdate('available')
        // Si no lanza error, el socket está vivo
      } catch {
        // Socket muerto - pero NO reconectar inmediatamente.
        // El connection.update handler lo manejará con su propio backoff.
        console.log(`[WA ${botId}] ❗ HEALTH CHECK: sendPresenceUpdate falló. El connection handler manejará la reconexión.`)
      }
    }

    // ── Caso 2: Limpiar locks de procesamiento atascados ──
    if (this.processingBuffers.size > 0) {
      for (const bufferKey of this.processingBuffers) {
        const botId = bufferKey.split(':')[0]
        const session = this.sessions.get(botId)
        if (!session || session.state.status === 'disconnected') {
          console.log(`[WA Manager] 🔓 Liberando lock atascado: ${bufferKey}`)
          this.processingBuffers.delete(bufferKey)
        }
      }
    }

    } finally {
      this.healthCheckRunning = false
    }
  }

  /**
   * Restore sessions that were previously connected.
   * Called once when the manager is first created (after server restart/HMR).
   * Uses saved credentials to reconnect without needing a new QR scan.
   */
  async restoreConnectedSessions(): Promise<void> {
    try {
      const supabase = await createServiceRoleClient()

      // Buscar sesiones — NO descargar credentials_backup completo (puede ser enorme)
      // Solo verificar si existe con una subquery ligera
      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('bot_id, phone_number, status, credentials_backup')

      if (!sessions || sessions.length === 0) {
        console.log('[WA Manager] No hay sesiones para restaurar')
        return
      }

      // Filtrar: sesiones que estaban activas O que tienen credenciales (locales o en DB)
      const restorableSessions = sessions.filter(s => {
        // Si estaba conectada/conectando, restaurar
        if (['connected', 'connecting', 'qr_ready'].includes(s.status)) return true
        // Si está desconectada pero tiene backup en DB, intentar restaurar
        if (s.credentials_backup && typeof s.credentials_backup === 'object') {
          const files = s.credentials_backup as Record<string, string>
          if (files['creds.json']) return true
        }
        // Si está desconectada pero tiene credenciales locales, intentar restaurar
        const sessionDir = path.join(SESSIONS_DIR, s.bot_id)
        if (fs.existsSync(path.join(sessionDir, 'creds.json'))) return true
        return false
      })

      console.log(`[WA Manager] Sesiones en DB: ${sessions.length}, restaurables: ${restorableSessions.length}`)

      if (restorableSessions.length === 0) {
        console.log('[WA Manager] No hay sesiones con credenciales para restaurar')
        return
      }

      console.log(`[WA Manager] Restaurando ${restorableSessions.length} sesion(es) previas...`)

      for (const dbSession of restorableSessions) {
        const botId = dbSession.bot_id
        const sessionDir = path.join(SESSIONS_DIR, botId)

        // Si no hay credenciales locales, intentar restaurar desde DB
        if (!fs.existsSync(sessionDir) || !fs.existsSync(path.join(sessionDir, 'creds.json'))) {
          console.log(`[WA Manager] Bot ${botId}: sin credenciales locales, intentando restaurar desde DB...`)
          const restored = await restoreCredentialsFromDb(botId)
          if (!restored) {
            console.log(`[WA Manager] Bot ${botId}: sin credenciales en DB tampoco, marcando como desconectado`)
            await this.updateDbStatus(botId, 'disconnected')
            continue
          }
        }

        // Siempre cerrar socket viejo para re-registrar event listeners
        // (HMR invalida los closures de los listeners anteriores)
        const existing = this.sessions.get(botId)
        if (existing?.socket) {
          console.log(`[WA Manager] Bot ${botId}: cerrando socket anterior para re-registrar listeners...`)
          try {
            // Remover TODOS los listeners para evitar race conditions
            // (el close handler podría intentar auto-reconectar y competir)
            existing.socket.ev.removeAllListeners('connection.update')
            existing.socket.ev.removeAllListeners('creds.update')
            existing.socket.ev.removeAllListeners('messages.upsert')
            existing.socket.ev.removeAllListeners('messages.update')
            existing.socket.ev.removeAllListeners('contacts.upsert')
            existing.socket.ev.removeAllListeners('contacts.update')
            existing.socket.ev.removeAllListeners('messaging-history.set')
            existing.socket.end(undefined)
          } catch { /* silent */ }
        }

        console.log(`[WA Manager] Bot ${botId}: restaurando conexion con credenciales guardadas...`)

        try {
          const managedSession: ManagedSession = {
            socket: null,
            state: {
              status: 'connecting',
              qrCode: null,
              qrRaw: null,
              phoneNumber: dbSession.phone_number || null,
              lastConnectedAt: null,
            },
            retryCount: 0,
            lastOpenedAt: 0,
            unstableCount: 0,
          }
          this.sessions.set(botId, managedSession)

          // Reconnect using existing credentials (no QR needed)
          await this.initSocket(botId, false)
          console.log(`[WA Manager] Bot ${botId}: socket iniciado, esperando conexion...`)
        } catch (err) {
          console.error(`[WA Manager] Bot ${botId}: error restaurando:`, err)
          await this.updateDbStatus(botId, 'disconnected')
          this.sessions.delete(botId)
        }
      }
    } catch (err) {
      console.error('[WA Manager] Error en restoreConnectedSessions:', err)
    }
  }

  /**
   * Full diagnostic of all sessions - logs to console and returns report
   */
  diagnose(): Record<string, unknown>[] {
    const report: Record<string, unknown>[] = []
    console.log(`\n========== WA MANAGER DIAGNOSTICO ==========`)
    console.log(`Sesiones en memoria: ${this.sessions.size}`)
    console.log(`Buffers activos: ${this.messageBuffers.size}`)
    console.log(`Restauracion global: ${globalForWa.waManagerRestored ?? false}`)

    for (const [botId, session] of this.sessions) {
      const hasSocket = !!session.socket
      const socketUser = session.socket?.user
      const ws = (session.socket as unknown as { ws?: { isOpen?: boolean; isClosed?: boolean } })?.ws
      const wsOpen = ws?.isOpen === true
      const info = {
        botId,
        status: session.state.status,
        phoneNumber: session.state.phoneNumber,
        hasSocket,
        socketUser: socketUser?.id || null,
        wsOpen,
        retryCount: session.retryCount,
      }
      console.log(`[Bot ${botId}]`, JSON.stringify(info, null, 2))
      report.push(info)
    }

    if (this.sessions.size === 0) {
      console.log('⚠️ NO HAY SESIONES EN MEMORIA')
    }
    console.log(`=============================================\n`)
    return report
  }

  /**
   * Get the current state for a bot session
   */
  getSessionState(botId: string): WASessionState {
    const session = this.sessions.get(botId)
    if (!session) {
      return {
        status: 'disconnected',
        qrCode: null,
        qrRaw: null,
        phoneNumber: null,
        lastConnectedAt: null,
      }
    }
    return { ...session.state }
  }

  /**
   * Start a WhatsApp connection for a bot
   * Waits for the QR code before returning so the caller gets it immediately.
   */
  async connect(botId: string): Promise<WASessionState> {
    // If already connected or connecting, return current state
    const existing = this.sessions.get(botId)
    if (existing?.state.status === 'connected') {
      return existing.state
    }
    if (existing?.state.status === 'qr_ready' && existing?.state.qrCode) {
      return existing.state
    }

    // Clean up any previous socket
    if (existing?.socket) {
      try {
        existing.socket.end(undefined)
      } catch {
        // ignore cleanup errors
      }
    }

    // Initialize session state
    const managedSession: ManagedSession = {
      socket: null,
      state: {
        status: 'connecting',
        qrCode: null,
        qrRaw: null,
        phoneNumber: null,
        lastConnectedAt: null,
      },
      retryCount: 0,
      lastOpenedAt: 0,
      unstableCount: 0,
    }
    this.sessions.set(botId, managedSession)

    // Update DB status
    await this.updateDbStatus(botId, 'connecting')

    // Start the actual connection (fresh = true to clean stale credentials)
    try {
      console.log(`[WA ${botId}] Llamando initSocket...`)
      await this.initSocket(botId, true)
      console.log(`[WA ${botId}] initSocket completado OK. Esperando QR...`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[WA ${botId}] Error en initSocket: ${errMsg}`)
      managedSession.state.status = 'disconnected'
      managedSession.state.qrCode = null
      managedSession.state.qrRaw = null
      await this.updateDbStatus(botId, 'disconnected')
      throw new Error(`Error inicializando WhatsApp: ${errMsg}`)
    }

    // Wait for QR code or connection (up to 50 seconds)
    // This keeps the request alive so the QR is returned directly
    const qrReady = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 50_000)
      const check = setInterval(() => {
        const s = this.sessions.get(botId)
        if (!s) { clearInterval(check); clearTimeout(timeout); resolve(false); return }
        if (s.state.qrCode) { clearInterval(check); clearTimeout(timeout); resolve(true); return }
        if (s.state.status === 'connected') { clearInterval(check); clearTimeout(timeout); resolve(true); return }
        if (s.state.status === 'disconnected') { clearInterval(check); clearTimeout(timeout); resolve(false); return }
      }, 300)
    })

    if (qrReady) {
      console.log(`[WA ${botId}] QR obtenido exitosamente!`)
    } else {
      const currentState = this.getSessionState(botId)
      console.log(`[WA ${botId}] Timeout esperando QR (50s). Estado actual: ${currentState.status}, hasQR: ${!!currentState.qrCode}`)
    }

    return this.getSessionState(botId)
  }

  /**
   * Initialize the Baileys socket for a bot
   * @param fresh - if true, deletes existing credentials to force new QR
   */
  private async initSocket(botId: string, fresh: boolean = false): Promise<void> {
    const sessionDir = path.join(SESSIONS_DIR, botId)
    console.log(`[WA ${botId}] initSocket: sessionDir=${sessionDir}, fresh=${fresh}, VERCEL=${!!process.env.VERCEL}`)

    // Only clean credentials on fresh connections (user clicked "Connect")
    // On restores/reconnects, keep credentials to avoid needing a new QR
    if (fresh && fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true })
        console.log(`[WA ${botId}] Credenciales anteriores limpiadas (fresh connect)`)
      } catch (err) {
        console.error(`[WA ${botId}] Error limpiando credenciales:`, err)
      }
    }

    // Si no hay credenciales locales, intentar restaurar desde DB
    if (!fresh && !fs.existsSync(path.join(sessionDir, 'creds.json'))) {
      await restoreCredentialsFromDb(botId)
    }

    try {
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true })
      }
      console.log(`[WA ${botId}] Directorio de sesion listo: ${sessionDir}`)
    } catch (err) {
      console.error(`[WA ${botId}] ERROR creando directorio de sesion:`, err)
      throw new Error(`No se pudo crear directorio de sesion: ${err instanceof Error ? err.message : err}`)
    }

    let authState, saveCreds
    try {
      const authResult = await useMultiFileAuthState(sessionDir)
      authState = authResult.state
      saveCreds = authResult.saveCreds
      console.log(`[WA ${botId}] Auth state cargado correctamente`)
    } catch (err) {
      console.error(`[WA ${botId}] ERROR cargando auth state:`, err)
      throw new Error(`Error cargando auth state: ${err instanceof Error ? err.message : err}`)
    }

    // Obtener la version mas reciente de WA Web (con timeout y fallback)
    let version: [number, number, number] | undefined
    try {
      const versionResult = await Promise.race([
        fetchLatestBaileysVersion(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
      ])
      version = versionResult.version as [number, number, number]
      console.log(`[WA ${botId}] Version WA Web obtenida: ${version.join('.')}`)
    } catch (err) {
      console.log(`[WA ${botId}] No se pudo obtener version WA Web (${err}), usando version por defecto de Baileys`)
    }

    console.log(`[WA ${botId}] Iniciando socket con Baileys...`)

    const socket = makeWASocket({
      ...(version ? { version } : {}),
      auth: {
        creds: authState.creds,
        keys: makeCacheableSignalKeyStore(authState.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      browser: ['Agente de Ventas Bot', 'Chrome', '120.0.0'],
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: true,
    })

    const session = this.sessions.get(botId)
    if (!session) return
    session.socket = socket

    // Handle connection updates (QR, connection status)
    socket.ev.on('connection.update', async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update
        const currentSession = this.sessions.get(botId)
        if (!currentSession) return

        // QR code received - generate image
        if (qr) {
          console.log(`[WA ${botId}] QR recibido de Baileys, generando imagen...`)
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: { dark: '#ffffff', light: '#0c1425' },
            })
            currentSession.state.status = 'qr_ready'
            currentSession.state.qrCode = qrDataUrl
            currentSession.state.qrRaw = qr
            console.log(`[WA ${botId}] QR generado exitosamente`)
            await this.updateDbStatus(botId, 'qr_ready', undefined, qrDataUrl)
          } catch (err) {
            console.error(`[WA ${botId}] Error generando QR:`, err)
            currentSession.state.status = 'qr_ready'
            currentSession.state.qrRaw = qr
          }
        }

        // Connection opened
        if (connection === 'open') {
          const phoneNumber = socket.user?.id?.split(':')[0] || socket.user?.id?.split('@')[0] || null
          const now = new Date().toISOString()

          currentSession.state.status = 'connected'
          currentSession.state.qrCode = null
          currentSession.state.qrRaw = null
          currentSession.state.phoneNumber = phoneNumber
          currentSession.state.lastConnectedAt = now
          currentSession.retryCount = 0
          currentSession.lastOpenedAt = Date.now()

          await this.updateDbStatus(botId, 'connected', phoneNumber)
          console.log(`[WA ${botId}] ✅ Conectado exitosamente - ${phoneNumber} (instance=${INSTANCE_ID.substring(0, 8)})`)

          // Backup completo de credenciales a DB al conectar
          backupCredentialsToDb(botId).catch(err => {
            console.error(`[WA ${botId}] ❌ Error en backup de credenciales al conectar:`, err)
          })

          // Marcar presencia como disponible al conectar (global)
          try {
            await socket.sendPresenceUpdate('available')
            console.log(`[WA ${botId}] 🟢 Presencia inicial: EN LINEA (global)`)
          } catch { /* silent */ }

          // Suscribir presencia a contactos recientes para que vean al bot en linea
          try {
            const supa = await createServiceRoleClient()
            const { data: recentConvos } = await supa
              .from('conversations')
              .select('contact_id, contacts:contact_id(phone)')
              .eq('bot_id', botId)
              .order('last_message_at', { ascending: false })
              .limit(50)

            if (recentConvos && recentConvos.length > 0) {
              let subscribed = 0
              const seen = new Set<string>()
              for (const c of recentConvos) {
                const phone = (c.contacts as unknown as { phone: string } | null)?.phone
                if (!phone || seen.has(phone)) continue
                seen.add(phone)
                // Determinar JID correcto: numeros de 13+ digitos son LID
                const jid = phone.length >= 13 ? `${phone}@lid` : `${phone}@s.whatsapp.net`
                try {
                  await socket.presenceSubscribe(jid)
                  subscribed++
                } catch { /* silent - contact may not exist */ }
              }
              console.log(`[WA ${botId}] 👥 Presencia suscrita a ${subscribed} contactos recientes`)
            }
          } catch (err) {
            console.log(`[WA ${botId}] ⚠️ Error suscribiendo presencia a contactos: ${err}`)
          }

          console.log(`[WA ${botId}] 🎧 Socket listo para recibir mensajes. Listeners activos.`)
        }

        // Connection closed
        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut
            && statusCode !== DisconnectReason.connectionReplaced

          console.log(`[WA ${botId}] Conexion cerrada. Codigo: ${statusCode}. Reconectar: ${shouldReconnect}. Instance: ${INSTANCE_ID.substring(0, 8)}`)

          // 440 = connectionReplaced: otra instancia se conectó con las mismas credenciales
          // NO reconectar — la otra instancia es la activa
          if (statusCode === DisconnectReason.connectionReplaced) {
            console.log(`[WA ${botId}] ⚠️ Conexión reemplazada por otra instancia (code=440). Deteniendo reconexión.`)
            currentSession.state.status = 'disconnected'
            currentSession.socket = null
            // NO actualizar DB ni limpiar credenciales - la otra instancia las necesita
            return
          }

          if (statusCode === DisconnectReason.loggedOut) {
            console.log(`[WA ${botId}] ⚠️ Logged out (code=${statusCode}). Limpiando credenciales...`)
            currentSession.state.status = 'disconnected'
            currentSession.state.qrCode = null
            currentSession.state.qrRaw = null
            currentSession.state.phoneNumber = null
            currentSession.socket = null
            await this.updateDbStatus(botId, 'disconnected')

            // Remove auth files so next connect generates fresh QR
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true })
            } catch {
              // ignore
            }
            console.log(`[WA ${botId}] 🗑️ Credenciales limpiadas. Necesita escanear QR nuevamente.`)
          } else if (shouldReconnect && currentSession.retryCount < 15) {
            // Detectar conexión inestable: si se cerró en menos de 30s desde que se abrió
            const timeSinceOpen = currentSession.lastOpenedAt > 0
              ? Date.now() - currentSession.lastOpenedAt
              : Infinity
            if (timeSinceOpen < 30_000) {
              currentSession.unstableCount++
              console.log(`[WA ${botId}] ⚠️ Conexión inestable (duró ${(timeSinceOpen / 1000).toFixed(0)}s, unstableCount=${currentSession.unstableCount})`)
            } else {
              // Conexión fue estable, resetear contador
              currentSession.unstableCount = 0
            }

            // Si la conexión es muy inestable (>3 veces seguidas), esperar más
            if (currentSession.unstableCount >= 3) {
              const longBackoff = 120_000 // 2 minutos
              console.log(`[WA ${botId}] 🛑 Conexión inestable repetida (${currentSession.unstableCount}x). Esperando ${longBackoff / 1000}s antes de reintentar...`)
              currentSession.retryCount++
              currentSession.state.status = 'connecting'
              setTimeout(() => this.initSocket(botId, false), longBackoff)
            } else {
              // Auto-reconnect with exponential backoff (3s, 6s, 12s, 24s... max 60s)
              currentSession.retryCount++
              currentSession.state.status = 'connecting'
              const backoff = Math.min(3000 * Math.pow(2, currentSession.retryCount - 1), 60_000)
              console.log(`[WA ${botId}] Reconectando (intento ${currentSession.retryCount}/15) en ${(backoff / 1000).toFixed(0)}s...`)
              setTimeout(() => this.initSocket(botId, false), backoff)
            }
          } else {
            console.log(`[WA ${botId}] ❌ Agotados reintentos de reconexion (${currentSession.retryCount}/15). Health check intentara reconectar.`)
            // Hacer backup de credenciales antes de marcar como desconectado
            backupCredentialsToDb(botId).catch(err => {
              console.error(`[WA ${botId}] Error en backup pre-disconnect:`, err)
            })
            currentSession.state.status = 'disconnected'
            currentSession.socket = null
            await this.updateDbStatus(botId, 'disconnected')
          }
        }
      } catch (err) {
        console.error(`[WA ${botId}] Error en connection.update handler:`, err)
      }
    })

    // Save credentials on update (for session persistence)
    socket.ev.on('creds.update', async () => {
      await saveCreds()
      // Backup credentials to DB after every update (for container persistence)
      backupCredentialsToDb(botId).catch(err => {
        console.error(`[WA ${botId}] ❌ Error en backup de credenciales (creds.update):`, err)
      })
    })

    // Debug: listen for history sync events
    socket.ev.on('messaging-history.set', ({ messages: histMsgs, isLatest }) => {
      console.log(`[WA ${botId}] 📚 HISTORY SYNC: ${histMsgs?.length || 0} mensajes, isLatest=${isLatest}`)
    })

    // Handle incoming messages
    console.log(`[WA ${botId}] 🎧 Registrando listener messages.upsert...`)
    socket.ev.on('messages.upsert', async ({ messages: newMessages, type }) => {
      console.log(`[WA ${botId}] 📨 EVENT messages.upsert: type=${type}, count=${newMessages?.length || 0}`)

      if (type !== 'notify') {
        console.log(`[WA ${botId}] ⏭️ Ignorando messages.upsert type=${type} (solo procesamos 'notify')`)
        return
      }

      for (const msg of newMessages) {
        const jid = msg.key.remoteJid || 'unknown'
        const fromMe = msg.key.fromMe
        console.log(`[WA ${botId}] 📋 Mensaje: jid=${jid}, fromMe=${fromMe}, hasMessage=${!!msg.message}`)

        // Skip status broadcasts and own messages
        if (jid === 'status@broadcast') {
          console.log(`[WA ${botId}] ⏭️ Ignorando status broadcast`)
          continue
        }
        if (fromMe) {
          console.log(`[WA ${botId}] ⏭️ Ignorando mensaje propio`)
          continue
        }

        try {
          await this.handleIncomingMessage(botId, socket, msg)
        } catch (err) {
          console.error(`[WA ${botId}] ❌ ERROR en handleIncomingMessage:`, err)
        }
      }
    })

    // Also listen for all events to diagnose issues
    socket.ev.on('messages.update', (updates) => {
      console.log(`[WA ${botId}] 📝 EVENT messages.update: ${updates.length} update(s)`)
    })

    // Escuchar contactos para mapear LID → numero real
    socket.ev.on('contacts.upsert', (contacts) => {
      for (const c of contacts) {
        let lid: string | null = null
        let phone: string | null = null
        if (c.lid && c.phoneNumber) {
          lid = c.lid.split('@')[0]
          phone = c.phoneNumber.split('@')[0]
        } else if (c.id?.endsWith('@lid') && c.phoneNumber) {
          lid = c.id.split('@')[0]
          phone = c.phoneNumber.split('@')[0]
        }
        if (lid && phone) {
          // Evict oldest entries if map is too large
          if (this.lidToPhone.size >= WhatsAppManager.MAX_LID_MAP_SIZE) {
            const firstKey = this.lidToPhone.keys().next().value
            if (firstKey) this.lidToPhone.delete(firstKey)
          }
          this.lidToPhone.set(lid, phone)
          console.log(`[WA ${botId}] 📇 LID mapeado: ${lid} → ${phone}`)
          this.updateContactPhoneInDb(botId, lid, phone)
        }
      }
    })

    socket.ev.on('contacts.update', (contacts) => {
      for (const c of contacts) {
        if (c.id?.endsWith('@lid') && c.phoneNumber) {
          const lid = c.id.split('@')[0]
          const phone = c.phoneNumber.split('@')[0]
          if (this.lidToPhone.size >= WhatsAppManager.MAX_LID_MAP_SIZE) {
            const firstKey = this.lidToPhone.keys().next().value
            if (firstKey) this.lidToPhone.delete(firstKey)
          }
          this.lidToPhone.set(lid, phone)
          console.log(`[WA ${botId}] 📇 LID actualizado: ${lid} → ${phone}`)
          this.updateContactPhoneInDb(botId, lid, phone)
        }
      }
    })

    console.log(`[WA ${botId}] ✅ Listeners registrados exitosamente`)
  }

  /**
   * Procesar un mensaje entrante: extraer contenido, manejar media, y agregar al buffer
   */
  private async handleIncomingMessage(
    botId: string,
    socket: WASocket,
    msg: WAMessage
  ): Promise<void> {
    const remoteJid = msg.key.remoteJid || ''
    const rawPhone = remoteJid.split('@')[0] || ''
    const isLid = remoteJid.endsWith('@lid')

    // Resolver LID → numero real si esta disponible
    let contactPhone = rawPhone
    if (isLid && this.lidToPhone.has(rawPhone)) {
      contactPhone = this.lidToPhone.get(rawPhone)!
      console.log(`[WA ${botId}] 📇 LID ${rawPhone} resuelto a numero real: ${contactPhone}`)
    } else if (isLid) {
      console.log(`[WA ${botId}] ⚠️ LID ${rawPhone} sin numero real mapeado (aun)`)
    }

    const contactName = msg.pushName || contactPhone
    console.log(`[WA ${botId}] 📌 JID original: ${remoteJid}, telefono: ${contactPhone}`)

    let messageContent = ''
    let messageType: 'text' | 'audio' | 'image' = 'text'

    // --- Texto normal ---
    if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
      messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
      messageType = 'text'
    }
    // --- Audio / Nota de voz ---
    else if (msg.message?.audioMessage) {
      messageType = 'audio'
      try {
        console.log(`[WA ${botId}] Audio recibido de ${contactName}, transcribiendo...`)
        const buffer = await downloadMediaMessage(msg, 'buffer', {})
        const mimeType = msg.message.audioMessage.mimetype || 'audio/ogg'
        const transcription = await transcribeAudio(buffer as Buffer, mimeType)
        if (transcription) {
          messageContent = `[Audio transcrito]: ${transcription}`
        } else {
          messageContent = '[Audio recibido - no se pudo transcribir]'
        }
      } catch (err) {
        console.error(`[WA ${botId}] Error procesando audio:`, err)
        messageContent = '[Audio recibido - error al procesar]'
      }
    }
    // --- Imagen ---
    else if (msg.message?.imageMessage) {
      messageType = 'image'
      const caption = msg.message.imageMessage.caption || ''
      messageContent = caption
        ? `[Imagen recibida con texto]: ${caption}`
        : '[Imagen recibida]'
    }
    // --- Video ---
    else if (msg.message?.videoMessage) {
      const caption = msg.message.videoMessage.caption || ''
      messageContent = caption
        ? `[Video recibido con texto]: ${caption}`
        : '[Video recibido]'
    }
    // --- Documento ---
    else if (msg.message?.documentMessage) {
      const fileName = msg.message.documentMessage.fileName || 'documento'
      messageContent = `[Documento recibido: ${fileName}]`
    }
    // --- Sticker ---
    else if (msg.message?.stickerMessage) {
      messageContent = '[Sticker recibido]'
    }
    // --- Ubicacion ---
    else if (msg.message?.locationMessage) {
      const lat = msg.message.locationMessage.degreesLatitude
      const lng = msg.message.locationMessage.degreesLongitude
      messageContent = `[Ubicacion compartida: ${lat}, ${lng}]`
    }
    // --- Contacto ---
    else if (msg.message?.contactMessage) {
      messageContent = `[Contacto compartido: ${msg.message.contactMessage.displayName || 'sin nombre'}]`
    }
    // --- Otros ---
    else {
      messageContent = '[Mensaje multimedia no soportado]'
    }

    console.log(`[WA ${botId}] 📩 MENSAJE RECIBIDO de ${contactName} (${contactPhone}): ${messageContent}`)

    // Guardar mensaje en DB (pasar LID original si fue resuelto, para actualizar contactos viejos)
    const { conversationId, contactId } = await this.saveIncomingMessage(
      botId, contactPhone, contactName, messageContent, msg.key.id || '',
      isLid ? rawPhone : undefined
    )

    console.log(`[WA ${botId}] 💾 Mensaje guardado en DB. conversationId=${conversationId}, contactId=${contactId}`)

    // Check if bot is paused for this contact BEFORE buffering
    if (conversationId) {
      const pauseCheck = await createServiceRoleClient()
      const { data: convCheck } = await pauseCheck.from('conversations').select('status').eq('id', conversationId).single()
      if (convCheck?.status === 'paused') {
        console.log(`[WA ${botId}] ⏸️ Bot pausado para ${contactPhone}, mensaje guardado pero no se responde`)
        return
      }
    }

    // Agregar al buffer (pasamos el JID original y el ID de Baileys para read receipts)
    const baileysMessageId = msg.key.id || ''
    if (conversationId && contactId) {
      this.addToBuffer(botId, contactPhone, contactName, messageContent, messageType, conversationId, contactId, remoteJid, baileysMessageId)
    } else {
      console.error(`[WA ${botId}] ❌ No se pudo guardar mensaje en DB - sin conversationId/contactId`)
    }
  }

  /**
   * Agregar mensaje al buffer. Si el buffer no existe, se crea.
   * Cada vez que llega un mensaje, se reinicia el timer del buffer.
   */
  private addToBuffer(
    botId: string,
    contactPhone: string,
    contactName: string,
    content: string,
    type: 'text' | 'audio' | 'image',
    conversationId: string,
    contactId: string,
    remoteJid: string = '',
    baileysId: string = ''
  ): void {
    const bufferKey = `${botId}:${contactPhone}`
    let buffer = this.messageBuffers.get(bufferKey)

    if (!buffer) {
      buffer = {
        botId,
        contactPhone,
        contactName,
        remoteJid: remoteJid || `${contactPhone}@s.whatsapp.net`,
        messages: [],
        timer: null,
        conversationId,
        contactId,
      }
      this.messageBuffers.set(bufferKey, buffer)
    }

    // Agregar mensaje al buffer
    buffer.messages.push({
      content,
      type,
      timestamp: Date.now(),
      baileysId,
    })

    // Reiniciar timer
    if (buffer.timer) {
      clearTimeout(buffer.timer)
    }

    console.log(`[Buffer ${bufferKey}] ${buffer.messages.length} mensaje(s) en buffer, esperando ${MESSAGE_BUFFER_TIMEOUT / 1000}s...`)

    buffer.timer = setTimeout(() => {
      this.processBuffer(bufferKey)
    }, MESSAGE_BUFFER_TIMEOUT)
  }

  /**
   * Procesar el buffer: concatenar mensajes, generar respuesta AI,
   * ejecutar secuencia SECUENCIAL simulando comportamiento humano real.
   *
   * Flujo:
   * 1. Buffer se cierra (10s sin mensajes nuevos)
   * 2. Ponerse "en linea" (presence: available)
   * 3. Esperar 10s → marcar como leido (doble check azul)
   * 4. Esperar 5-10s → activar "escribiendo..."
   * 5. Mantener "escribiendo" 5-8s
   * 6. Enviar mensaje 1 + fotos
   * 7. Para mensaje 2 y 3: repetir escribiendo + delay + enviar
   * 8. Guardar memoria de contexto
   * 9. Mantener "en linea" (health check refresca cada 30s)
   */
  private async processBuffer(bufferKey: string): Promise<void> {
    // Guard: evitar procesamiento concurrente del mismo contacto
    if (this.processingBuffers.has(bufferKey)) {
      console.log(`[Buffer ${bufferKey}] ⚠️ Ya se está procesando, omitiendo ejecución concurrente`)
      return
    }

    const buffer = this.messageBuffers.get(bufferKey)
    if (!buffer || buffer.messages.length === 0) {
      this.messageBuffers.delete(bufferKey)
      return
    }

    this.processingBuffers.add(bufferKey)

    // TRY/FINALLY: Garantizar que el lock SIEMPRE se libere, pase lo que pase
    try {

    // Copiar datos y limpiar buffer
    const messages = [...buffer.messages]
    const { botId, contactPhone, contactName, remoteJid, conversationId, contactId } = buffer
    const lastMessageKey = buffer.messages[buffer.messages.length - 1]
    this.messageBuffers.delete(bufferKey)

    const log = (icon: string, msg: string) => console.log(`[Bot ${bufferKey}] ${icon} ${msg}`)

    log('⏰', `Buffer cerrado con ${messages.length} mensaje(s). Iniciando flujo humano.`)

    // Concatenar todos los mensajes del buffer
    const combinedMessage = messages.map(m => m.content).join('\n')
    log('📝', `Mensaje combinado: "${combinedMessage.substring(0, 200)}${combinedMessage.length > 200 ? '...' : ''}"`)

    if (!conversationId) {
      log('❌', 'Sin conversationId, no se puede generar respuesta')
      return
    }

    // Obtener el socket antes de generar IA (validar conexion)
    const session = this.sessions.get(botId)
    if (!session?.socket || session.state.status !== 'connected') {
      log('❌', 'Bot no conectado, no se puede enviar respuesta')
      return
    }

    // JID original del contacto (puede ser @lid o @s.whatsapp.net)
    const jid = remoteJid || `${contactPhone}@s.whatsapp.net`
    log('📌', `JID del contacto: ${jid}`)

    // ══════════════════════════════════════════════════
    // PASO 1: Suscribirse a presencia del contacto + ponerse EN LINEA
    // ══════════════════════════════════════════════════
    // presenceSubscribe es necesario para que el contacto vea nuestro estado
    try {
      await session.socket.presenceSubscribe(jid)
      log('🔗', `Suscrito a presencia de ${jid}`)
    } catch (err) {
      log('⚠️', `No se pudo suscribir a presencia: ${err}`)
    }

    try {
      await session.socket.sendPresenceUpdate('available', jid)
      log('🟢', 'Presencia: EN LINEA (visible para el contacto)')
    } catch (err) {
      log('⚠️', `No se pudo poner en linea: ${err}`)
    }

    // ══════════════════════════════════════════════════
    // PASO 2: Generar respuesta IA (en paralelo con delay minimo de lectura)
    // ══════════════════════════════════════════════════
    log('🧠', 'Generando respuesta IA en paralelo con delay de lectura...')

    const [aiResponse] = await Promise.all([
      generateBotResponse(botId, contactPhone, combinedMessage, conversationId, contactName)
        .catch(err => {
          log('❌', `Error en generateBotResponse: ${err}`)
          return null
        }),
      // Delay minimo garantizado mientras la IA responde
      this.delay(DELAY_BEFORE_READ),
    ])

    if (!aiResponse) {
      log('⚠️', 'IA no genero respuesta (bot inactivo o error)')
      return
    }

    log('🤖', `Respuesta IA generada: msg1=${aiResponse.message1?.length || 0}ch, msg2=${aiResponse.message2?.length || 0}ch, msg3=${aiResponse.message3?.length || 0}ch, fotos=${aiResponse.photos_message1?.length || 0}`)

    // ══════════════════════════════════════════════════
    // TIMING: Usar valores del prompt (si existen) o defaults del sistema
    // ══════════════════════════════════════════════════
    const t = aiResponse.timing
    // Clamp helper: ensures timing values stay within safe bounds (0-120 seconds)
    const safeMs = (val: unknown): number => {
      const n = Number(val)
      return (isNaN(n) || !isFinite(n)) ? 0 : n
    }
    const clampMs = (val: number, min: number, max: number) => Math.max(min, Math.min(max, safeMs(val)))
    const MAX_DELAY = 120_000 // 2 minutes absolute max

    const readDelay = t?.delay_read !== null && t?.delay_read !== undefined
      ? clampMs(t.delay_read * 1000, 0, MAX_DELAY)
      : DELAY_BEFORE_READ
    const typingDelayMs = t?.delay_typing !== null && t?.delay_typing !== undefined
      ? clampMs(t.delay_typing * 1000, 0, MAX_DELAY)
      : DELAY_BEFORE_TYPING_MIN + Math.random() * (DELAY_BEFORE_TYPING_MAX - DELAY_BEFORE_TYPING_MIN)
    const typingDurMs = t?.typing_duration !== null && t?.typing_duration !== undefined
      ? clampMs(t.typing_duration * 1000, 0, MAX_DELAY)
      : TYPING_DURATION_MIN + Math.random() * (TYPING_DURATION_MAX - TYPING_DURATION_MIN)
    const betweenDelay = t?.delay_between !== null && t?.delay_between !== undefined
      ? clampMs(t.delay_between * 1000, 0, MAX_DELAY)
      : DELAY_BETWEEN_MSGS_MIN + Math.random() * (DELAY_BETWEEN_MSGS_MAX - DELAY_BETWEEN_MSGS_MIN)
    const shouldShowOnline = t?.show_online !== null && t?.show_online !== undefined
      ? t.show_online
      : true

    if (t) {
      log('⏱️', `Timing del prompt: read=${t.delay_read}s, typing=${t.delay_typing}s, dur=${t.typing_duration}s, between=${t.delay_between}s, online=${t.show_online}`)
    }

    // Si el prompt dice no mostrar en linea, ocultarse
    if (!shouldShowOnline) {
      try {
        await session.socket.sendPresenceUpdate('unavailable', jid)
        log('🔴', 'Presencia: OCULTO (por timing del prompt)')
      } catch { /* silent */ }
    }

    // Si el prompt define un delay_read mayor al default, esperar la diferencia
    if (t?.delay_read !== null && t?.delay_read !== undefined && readDelay > DELAY_BEFORE_READ) {
      const extra = readDelay - DELAY_BEFORE_READ
      log('⏳', `Delay extra de lectura: ${(extra / 1000).toFixed(1)}s (total: ${t.delay_read}s)`)
      await this.delay(extra)
    }

    // Verificar socket sigue vivo
    if (!session.socket || session.state.status !== 'connected') {
      log('❌', 'Socket se desconecto durante procesamiento')
      return
    }

    // ══════════════════════════════════════════════════
    // PASO 3: MARCAR COMO LEIDO (doble check azul)
    // ══════════════════════════════════════════════════
    // Usar los IDs reales de Baileys para cada mensaje en el buffer
    const messageKeys = messages
      .filter(m => m.baileysId)
      .map(m => ({ remoteJid: jid, id: m.baileysId }))

    if (messageKeys.length === 0) {
      log('⚠️', 'No hay IDs de Baileys para marcar como leido')
    }

    try {
      if (messageKeys.length > 0) {
        await session.socket.readMessages(messageKeys)
        log('✅', `${messageKeys.length} mensaje(s) marcado(s) como LEIDO (✔✔ azul) - IDs: ${messageKeys.map(k => k.id).join(', ')}`)
      }
    } catch (err) {
      log('⚠️', `No se pudo marcar como leido: ${err}`)
    }

    // ══════════════════════════════════════════════════
    // PASO 4: DELAY antes de escribir
    // ══════════════════════════════════════════════════
    log('⏳', `Esperando ${(typingDelayMs / 1000).toFixed(1)}s antes de escribir...`)
    await this.delay(typingDelayMs)

    // ══════════════════════════════════════════════════
    // PASO 5: ESCRIBIENDO...
    // ══════════════════════════════════════════════════
    try {
      await session.socket.sendPresenceUpdate('composing', jid)
      log('⌨️', 'Estado: ESCRIBIENDO...')
    } catch (err) {
      log('⚠️', `No se pudo activar typing: ${err}`)
    }

    log('⌨️', `Simulando escritura por ${(typingDurMs / 1000).toFixed(1)}s...`)
    await this.delay(typingDurMs)

    // Parar typing
    try { await session.socket.sendPresenceUpdate('paused', jid) } catch { /* silent */ }

    // ══════════════════════════════════════════════════
    // PASO 6: ENVIAR MENSAJE 1 + FOTOS
    // ══════════════════════════════════════════════════
    const supabase = await createServiceRoleClient()

    if (aiResponse.message1) {
      const sent = await this.sendMessage(botId, jid, aiResponse.message1)
      if (sent) {
        await this.saveBotMessage(supabase, conversationId, aiResponse.message1)
        log('✉️', `Mensaje 1 enviado: "${aiResponse.message1.substring(0, 80)}..."`)
      } else {
        log('❌', 'Fallo al enviar mensaje 1')
      }
    }

    // Enviar medios adjuntos al mensaje 1 (fotos, videos)
    if (aiResponse.photos_message1 && aiResponse.photos_message1.length > 0) {
      // Re-validate socket before sending media
      if (!session.socket || session.state.status !== 'connected') {
        log('❌', 'Socket desconectado antes de enviar medios')
        return
      }
      await this.delay(1000) // breve pausa antes de medios
      for (const mediaUrl of aiResponse.photos_message1) {
        if (!session.socket || session.state.status !== 'connected') {
          log('❌', 'Socket desconectado durante envio de medios')
          break
        }
        try {
          // Detectar si es video por extension
          const isVideo = /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(mediaUrl)
          if (isVideo) {
            await session.socket.sendMessage(jid, {
              video: { url: mediaUrl },
              caption: '',
            })
            log('🎬', `Video enviado: ${mediaUrl.substring(0, 60)}...`)
          } else {
            await session.socket.sendMessage(jid, {
              image: { url: mediaUrl },
              caption: '',
            })
            log('📷', `Foto enviada: ${mediaUrl.substring(0, 60)}...`)
          }
          await this.delay(800) // pausa entre medios
        } catch (err) {
          log('❌', `Error enviando medio: ${err}`)
        }
      }
    }

    // ══════════════════════════════════════════════════
    // PASO 7: ENVIAR MENSAJE 2 (con typing simulado)
    // ══════════════════════════════════════════════════
    if (aiResponse.message2) {
      // Pausa entre mensajes (usa timing del prompt o default)
      log('⏳', `Pausa entre mensajes: ${(betweenDelay / 1000).toFixed(1)}s`)
      await this.delay(betweenDelay)

      // Escribiendo...
      try { await session.socket.sendPresenceUpdate('composing', jid) } catch { /* silent */ }
      log('⌨️', 'Escribiendo mensaje 2...')
      const typingBetween = t?.typing_duration !== null && t?.typing_duration !== undefined
        ? t.typing_duration * 1000
        : TYPING_BETWEEN_MSGS_MIN + Math.random() * (TYPING_BETWEEN_MSGS_MAX - TYPING_BETWEEN_MSGS_MIN)
      await this.delay(typingBetween)
      try { await session.socket.sendPresenceUpdate('paused', jid) } catch { /* silent */ }

      const sent = await this.sendMessage(botId, jid, aiResponse.message2)
      if (sent) {
        await this.saveBotMessage(supabase, conversationId, aiResponse.message2)
        log('✉️', `Mensaje 2 enviado: "${aiResponse.message2.substring(0, 80)}..."`)
      } else {
        log('❌', 'Fallo al enviar mensaje 2')
      }
    }

    // ══════════════════════════════════════════════════
    // PASO 8: ENVIAR MENSAJE 3 (con typing simulado)
    // ══════════════════════════════════════════════════
    if (aiResponse.message3) {
      // Pausa entre mensajes (usa timing del prompt o default)
      log('⏳', `Pausa entre mensajes: ${(betweenDelay / 1000).toFixed(1)}s`)
      await this.delay(betweenDelay)

      // Escribiendo...
      try { await session.socket.sendPresenceUpdate('composing', jid) } catch { /* silent */ }
      log('⌨️', 'Escribiendo mensaje 3...')
      const typingBetween3 = t?.typing_duration !== null && t?.typing_duration !== undefined
        ? t.typing_duration * 1000
        : TYPING_BETWEEN_MSGS_MIN + Math.random() * (TYPING_BETWEEN_MSGS_MAX - TYPING_BETWEEN_MSGS_MIN)
      await this.delay(typingBetween3)
      try { await session.socket.sendPresenceUpdate('paused', jid) } catch { /* silent */ }

      const sent = await this.sendMessage(botId, jid, aiResponse.message3)
      if (sent) {
        await this.saveBotMessage(supabase, conversationId, aiResponse.message3)
        log('✉️', `Mensaje 3 enviado: "${aiResponse.message3.substring(0, 80)}..."`)
      } else {
        log('❌', 'Fallo al enviar mensaje 3')
      }
    }

    // ══════════════════════════════════════════════════
    // PASO 9: GUARDAR MEMORIA DE CONTEXTO EN DB
    // ══════════════════════════════════════════════════
    if (aiResponse.context_memory) {
      try {
        await supabase
          .from('conversations')
          .update({ product_interest: aiResponse.context_memory })
          .eq('id', conversationId)
        log('🧠', `Memoria guardada: ${aiResponse.context_memory.substring(0, 120)}...`)
      } catch (err) {
        log('⚠️', `Error guardando memoria: ${err}`)
      }
    }

    // ══════════════════════════════════════════════════
    // PASO 10: ENVIAR REPORTE AL NUMERO INTERNO (si hay confirmacion)
    // ══════════════════════════════════════════════════
    if (aiResponse.report && aiResponse.report.trim()) {
      log('📊', `Reporte IA: ${aiResponse.report}`)
      await this.sendReportToOwner(botId, aiResponse.report, jid)

      // Registrar la venta en la tabla orders
      if (contactId) {
        try {
          const { data: botData } = await supabase
            .from('bots')
            .select('tenant_id')
            .eq('id', botId)
            .single()

          if (botData) {
            let orderPayload: Record<string, unknown> | null = null

            if (aiResponse.order_data) {
              // Caso ideal: la IA envió datos estructurados del pedido
              const od = aiResponse.order_data
              orderPayload = {
                bot_id: botId,
                tenant_id: botData.tenant_id,
                contact_id: contactId,
                conversation_id: conversationId,
                product_id: od.product_id,
                quantity: od.quantity,
                total_amount: od.total_amount,
                currency: od.currency,
                status: 'confirmed',
                shipping_address: od.shipping_address,
                notes: `Venta confirmada por bot. Cliente: ${od.customer_name || contactName || 'N/A'}${od.customer_phone ? '. Tel: ' + od.customer_phone : ''}`,
              }
              log('🛒', `Pedido con datos estructurados: ${od.product_name} x${od.quantity} = ${od.currency} ${od.total_amount}`)
            } else {
              // Fallback: buscar producto mencionado en la conversación (product_interest)
              // para no registrar un producto incorrecto
              let fallbackProduct = null
              try {
                const { data: conv } = await supabase
                  .from('conversations')
                  .select('product_interest')
                  .eq('id', conversationId)
                  .single()
                const interest = conv?.product_interest || ''

                if (interest) {
                  // Buscar producto cuyo nombre coincida con el contexto de la conversación
                  const { data: allProducts } = await supabase
                    .from('products')
                    .select('id, name, price_unit, currency')
                    .eq('bot_id', botId)
                    .eq('is_active', true)

                  if (allProducts && allProducts.length > 0) {
                    const interestLower = interest.toLowerCase()
                    fallbackProduct = allProducts.find(p => interestLower.includes(p.name.toLowerCase())) || allProducts[0]
                  }
                } else {
                  // Sin contexto, usar primer producto activo
                  const { data: products } = await supabase
                    .from('products')
                    .select('id, name, price_unit, currency')
                    .eq('bot_id', botId)
                    .eq('is_active', true)
                    .limit(1)
                  fallbackProduct = products?.[0] || null
                }
              } catch {
                // Si falla, intentar primer producto
                const { data: products } = await supabase
                  .from('products')
                  .select('id, name, price_unit, currency')
                  .eq('bot_id', botId)
                  .eq('is_active', true)
                  .limit(1)
                fallbackProduct = products?.[0] || null
              }

              if (!fallbackProduct) {
                log('⚠️', 'Reporte sin datos de pedido y sin productos activos — no se puede registrar venta')
              } else {
                orderPayload = {
                  bot_id: botId,
                  tenant_id: botData.tenant_id,
                  contact_id: contactId,
                  conversation_id: conversationId,
                  product_id: fallbackProduct.id,
                  quantity: 1,
                  total_amount: fallbackProduct.price_unit || 0,
                  currency: fallbackProduct.currency || 'BOB',
                  status: 'confirmed',
                  notes: `Venta confirmada por bot (auto-detectada del reporte). Cliente: ${contactName || 'N/A'}. Reporte: ${aiResponse.report.substring(0, 200)}`,
                }
                log('🛒', `Pedido inferido del reporte: ${fallbackProduct.name} = ${fallbackProduct.currency} ${fallbackProduct.price_unit}`)
              }
            }

            if (orderPayload) {
              const { data: order, error: orderErr } = await supabase
                .from('orders')
                .insert(orderPayload)
                .select('id')
                .single()

              if (orderErr) {
                log('❌', `Error registrando venta: ${orderErr.message}`)
              } else {
                log('🛒', `✅ Venta registrada en DB: order_id=${order?.id}`)
              }
            }
          }
        } catch (err) {
          log('❌', `Error creando orden: ${err}`)
        }
      }
    }

    // Marcar conversación para seguimiento si está configurado
    if (conversationId) {
      try {
        const { data: followupSettings } = await supabase
          .from('followup_settings')
          .select('is_active, first_followup_minutes')
          .eq('bot_id', botId)
          .single()

        if (followupSettings?.is_active && followupSettings.first_followup_minutes > 0) {
          await supabase
            .from('conversations')
            .update({
              status: 'pending_followup',
              last_bot_message_at: new Date().toISOString(),
            })
            .eq('id', conversationId)
          log('📋', `Conversacion marcada para seguimiento (${followupSettings.first_followup_minutes} min)`)
        }
      } catch (err) {
        log('⚠️', `Error marcando seguimiento: ${err}`)
      }
    }

    // Mantener presencia como "en linea" (el health check la refresca cada 30s)
    log('✅', 'Flujo humano completado exitosamente')

    } catch (err) {
      console.error(`[Buffer ${bufferKey}] Error fatal en processBuffer:`, err)
      // Cleanup buffer in case of error to prevent memory leak
      this.messageBuffers.delete(bufferKey)
    } finally {
      // SIEMPRE liberar el lock, pase lo que pase (error, return temprano, etc.)
      this.processingBuffers.delete(bufferKey)
    }
  }

  /**
   * Disconnect a bot's WhatsApp session
   */
  async disconnect(botId: string): Promise<void> {
    const session = this.sessions.get(botId)
    if (!session) return

    if (session.socket) {
      try {
        await session.socket.logout()
      } catch {
        try {
          session.socket.end(undefined)
        } catch {
          // ignore
        }
      }
    }

    session.state = {
      status: 'disconnected',
      qrCode: null,
      qrRaw: null,
      phoneNumber: null,
      lastConnectedAt: null,
    }
    session.socket = null

    // Limpiar buffers y locks de procesamiento del bot
    for (const [key, buf] of this.messageBuffers) {
      if (buf.botId === botId) {
        if (buf.timer) clearTimeout(buf.timer)
        this.messageBuffers.delete(key)
      }
    }
    for (const key of this.processingBuffers) {
      if (key.startsWith(botId + ':')) {
        this.processingBuffers.delete(key)
      }
    }

    // Clean auth files for a fresh QR on next connect
    const sessionDir = path.join(SESSIONS_DIR, botId)
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true })
    } catch {
      // ignore
    }

    await this.updateDbStatus(botId, 'disconnected')
  }

  /**
   * Enviar reporte de venta al numero interno del dueño del bot.
   * Solo se ejecuta si el bot tiene report_phone configurado y hay reporte.
   */
  private async sendReportToOwner(botId: string, report: string, contactJid: string): Promise<void> {
    try {
      const supabase = await createServiceRoleClient()
      const { data: bot } = await supabase
        .from('bots')
        .select('report_phone')
        .eq('id', botId)
        .single()

      const reportPhone = bot?.report_phone
      if (!reportPhone) {
        console.log(`[WA ${botId}] 📊 Sin numero de reporte configurado, omitiendo envio`)
        return
      }

      // Normalizar el numero de reporte (agregar codigo de pais si falta)
      let normalizedPhone = reportPhone.replace(/[^0-9]/g, '')
      // Si el numero tiene 8 digitos o menos, probablemente le falta codigo de pais
      // Intentar obtener el codigo del numero del bot (ej: 591 de 59178515950)
      if (normalizedPhone.length <= 10) {
        const session = this.sessions.get(botId)
        const botPhone = session?.state.phoneNumber || ''
        // Extraer codigo de pais del numero del bot (los primeros digitos antes de los 8 digitos locales)
        if (botPhone.length > 8) {
          const countryCode = botPhone.substring(0, botPhone.length - 8)
          normalizedPhone = countryCode + normalizedPhone
          console.log(`[WA ${botId}] 📊 Numero reporte normalizado: ${reportPhone} → ${normalizedPhone} (codigo pais: ${countryCode})`)
        }
      }

      // Enviar el reporte como mensaje de WhatsApp al numero del dueño
      const reportJid = normalizedPhone.includes('@') ? normalizedPhone : `${normalizedPhone}@s.whatsapp.net`
      const sent = await this.sendMessage(botId, reportJid, report)

      if (sent) {
        console.log(`[WA ${botId}] 📊 ✅ Reporte enviado a ${reportPhone}`)
      } else {
        console.error(`[WA ${botId}] 📊 ❌ Fallo al enviar reporte a ${reportPhone}`)
      }
    } catch (err) {
      console.error(`[WA ${botId}] 📊 ❌ Error enviando reporte:`, err)
    }
  }

  /**
   * Send a text message through a bot's WhatsApp
   */
  async sendMessage(botId: string, phone: string, text: string): Promise<boolean> {
    const session = this.sessions.get(botId)
    if (!session?.socket || session.state.status !== 'connected') {
      console.error(`[WA ${botId}] No se puede enviar: no conectado (status=${session?.state.status})`)
      return false
    }

    try {
      // Usar el JID tal cual si ya tiene @, sino asumir @s.whatsapp.net
      const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
      console.log(`[WA ${botId}] 📤 sendMessage a JID: ${jid}`)
      await session.socket.sendMessage(jid, { text })
      return true
    } catch (err) {
      console.error(`[WA ${botId}] Error enviando mensaje:`, err)
      return false
    }
  }

  /**
   * Update session status in Supabase
   */
  private async updateDbStatus(
    botId: string,
    status: string,
    phoneNumber?: string | null,
    qrCode?: string | null
  ): Promise<void> {
    try {
      const supabase = await createServiceRoleClient()

      const updateData: Record<string, unknown> = { status }

      if (status === 'connected') {
        updateData.phone_number = phoneNumber || null
        updateData.qr_code = null
        updateData.last_connected_at = new Date().toISOString()
      } else if (status === 'disconnected') {
        // Preservar phone_number para referencia (el usuario quiere saber qué número estaba conectado)
        updateData.qr_code = null
      } else if (status === 'qr_ready' && qrCode) {
        updateData.qr_code = qrCode
      } else if (status === 'connecting') {
        updateData.qr_code = null
      }

      // Upsert - create if not exists
      const { data: existing } = await supabase
        .from('whatsapp_sessions')
        .select('id')
        .eq('bot_id', botId)
        .single()

      if (existing) {
        await supabase
          .from('whatsapp_sessions')
          .update(updateData)
          .eq('bot_id', botId)
      } else {
        await supabase
          .from('whatsapp_sessions')
          .insert({ bot_id: botId, ...updateData })
      }

      // Send user notification for connect/disconnect events
      if (status === 'connected' || status === 'disconnected') {
        const { data: bot } = await supabase
          .from('bots')
          .select('name, tenant_id, tenants:tenant_id(owner_id)')
          .eq('id', botId)
          .single()

        const ownerId = (bot?.tenants as unknown as { owner_id: string } | null)?.owner_id
        if (ownerId) {
          createUserNotification({
            userId: ownerId,
            type: status === 'connected' ? 'whatsapp_conectado' : 'whatsapp_desconectado',
            title: status === 'connected' ? 'WhatsApp conectado' : 'WhatsApp desconectado',
            message: status === 'connected'
              ? `El bot "${bot?.name}" se conecto a WhatsApp${phoneNumber ? ` (${phoneNumber})` : ''}.`
              : `El bot "${bot?.name}" se desconecto de WhatsApp.`,
            link: `/bots/${botId}`,
          }).catch(() => {})
        }
      }
    } catch (err) {
      console.error(`[WA ${botId}] Error actualizando DB:`, err)
    }
  }

  /**
   * Save an incoming message to Supabase.
   * Returns conversationId and contactId for the buffer.
   */
  private async saveIncomingMessage(
    botId: string,
    contactPhone: string,
    contactName: string,
    content: string,
    externalId: string,
    lidPhone?: string
  ): Promise<{ conversationId: string | null; contactId: string | null }> {
    try {
      const supabase = await createServiceRoleClient()

      // Get the bot's tenant_id
      const { data: bot } = await supabase
        .from('bots')
        .select('tenant_id')
        .eq('id', botId)
        .single()

      if (!bot) {
        console.error(`[WA ${botId}] Bot no encontrado en DB`)
        return { conversationId: null, contactId: null }
      }

      // Find or create contact
      // El telefono puede ser un LID (>=13 digitos) o un numero real
      const isLidPhone = contactPhone.length >= 13

      // 1. Buscar por el telefono exacto
      const { data: exactMatch } = await supabase
        .from('contacts')
        .select('id, phone')
        .eq('bot_id', botId)
        .eq('phone', contactPhone)
        .limit(1)

      let foundContact = exactMatch?.[0] || null

      // 2. Si no encontramos y tenemos un LID diferente al contactPhone, buscar por LID
      if (!foundContact && lidPhone && lidPhone !== contactPhone) {
        const { data: lidResults } = await supabase
          .from('contacts')
          .select('id, phone')
          .eq('bot_id', botId)
          .eq('phone', lidPhone)
          .limit(1)

        const lidContact = lidResults?.[0] || null
        if (lidContact) {
          await supabase
            .from('contacts')
            .update({ phone: contactPhone })
            .eq('id', lidContact.id)
          console.log(`[WA ${botId}] 📇 Contacto actualizado: LID ${lidPhone} → ${contactPhone}`)
          foundContact = lidContact
        }
      }

      // 3. Si el telefono es un LID no resuelto, buscar por push_name
      //    (el contacto pudo haber sido actualizado a numero real en una sesion anterior)
      if (!foundContact && isLidPhone && contactName && contactName !== contactPhone) {
        const { data: nameResults } = await supabase
          .from('contacts')
          .select('id, phone')
          .eq('bot_id', botId)
          .eq('push_name', contactName)
          .limit(1)

        const nameMatch = nameResults?.[0] || null
        if (nameMatch) {
          console.log(`[WA ${botId}] 📇 Contacto encontrado por push_name "${contactName}": ${nameMatch.phone} (LID: ${contactPhone})`)
          foundContact = nameMatch
        }
      }

      if (!foundContact) {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            bot_id: botId,
            tenant_id: bot.tenant_id,
            phone: contactPhone,
            name: contactName,
            push_name: contactName,
          })
          .select('id, phone')
          .single()

        if (contactError) {
          console.error(`[WA ${botId}] Error creando contacto:`, contactError)
          return { conversationId: null, contactId: null }
        }
        foundContact = newContact
      }

      if (!foundContact) return { conversationId: null, contactId: null }

      // Find or create active conversation
      // Buscar conversaciones activas O pending_followup (el cliente respondió durante seguimiento)
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id, status')
        .eq('bot_id', botId)
        .eq('contact_id', foundContact.id)
        .in('status', ['active', 'pending_followup'])
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single()

      if (!conversation) {
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            bot_id: botId,
            contact_id: foundContact.id,
            tenant_id: bot.tenant_id,
            status: 'active',
            last_message_at: new Date().toISOString(),
          })
          .select('id, status')
          .single()

        if (convError) {
          console.error(`[WA ${botId}] Error creando conversacion:`, convError)
          return { conversationId: null, contactId: null }
        }
        conversation = newConversation
      }

      if (!conversation) return { conversationId: null, contactId: null }

      // Save the message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender: 'client',
        type: 'text',
        content,
        metadata: { external_id: externalId },
      })

      if (msgError) {
        console.error(`[WA ${botId}] Error guardando mensaje:`, msgError)
      }

      // Update conversation: last_message_at + reset followup si el cliente respondió
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          status: 'active',
          followup_count: 0,
          last_followup_at: null,
        })
        .eq('id', conversation.id)

      return { conversationId: conversation.id, contactId: foundContact.id }
    } catch (err) {
      console.error(`[WA ${botId}] Error en saveIncomingMessage:`, err)
      return { conversationId: null, contactId: null }
    }
  }

  /**
   * Actualizar el telefono de un contacto en la DB cuando se descubre el mapeo LID → numero real.
   * Se ejecuta en background (no bloquea el flujo principal).
   */
  private async updateContactPhoneInDb(botId: string, lidPhone: string, realPhone: string): Promise<void> {
    try {
      const supabase = await createServiceRoleClient()
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('bot_id', botId)
        .eq('phone', lidPhone)
        .limit(1)

      const found = contact?.[0]
      if (found) {
        await supabase
          .from('contacts')
          .update({ phone: realPhone })
          .eq('id', found.id)
        console.log(`[WA ${botId}] 📇 DB actualizada: contacto ${found.id} LID ${lidPhone} → ${realPhone}`)
      }
    } catch (err) {
      console.error(`[WA ${botId}] ⚠️ Error actualizando contacto LID→phone en DB:`, err)
    }
  }

  /**
   * Guardar un mensaje enviado por el bot en la DB
   */
  private async saveBotMessage(
    supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
    conversationId: string,
    content: string
  ): Promise<void> {
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender: 'bot',
        type: 'text',
        content,
      })

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
    } catch (err) {
      console.error(`[WA] Error guardando mensaje del bot:`, err)
    }
  }

  /** Utilidad: esperar N milisegundos */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** Utilidad: esperar un tiempo aleatorio entre min y max ms */
  private randomDelay(min: number, max: number): Promise<void> {
    const ms = min + Math.random() * (max - min)
    return this.delay(Math.round(ms))
  }
}

// Global singleton - persists across API calls in the same Node.js process
const globalForWa = globalThis as unknown as {
  waManager: WhatsAppManager | undefined
  waManagerRestored: boolean | undefined
}

export function getWhatsAppManager(): WhatsAppManager {
  if (!globalForWa.waManager) {
    console.log('[WA Manager] Creando nueva instancia del WhatsAppManager...')
    globalForWa.waManager = new WhatsAppManager()
  }
  return globalForWa.waManager
}

/**
 * Inicializa el manager Y restaura sesiones. Llamar desde instrumentation.ts
 * Retorna una promesa que se resuelve cuando la restauración termina.
 */
export async function initWhatsAppManager(): Promise<WhatsAppManager> {
  const mgr = getWhatsAppManager()
  if (!globalForWa.waManagerRestored) {
    console.log('[WA Manager] Iniciando restauración de sesiones...')
    try {
      await mgr.restoreConnectedSessions()
      globalForWa.waManagerRestored = true
      console.log('[WA Manager] Restauración completada')
    } catch (err) {
      console.error('[WA Manager] Error en restauración inicial, health check reintentará:', err)
      // No marcar como restored para que se pueda reintentar
    }
  }
  return mgr
}
