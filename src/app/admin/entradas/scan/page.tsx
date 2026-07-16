'use client'

/**
 * Entradas — ESCÁNER de QR para el check-in en la puerta.
 *
 * Usa la cámara del celular y el `BarcodeDetector` nativo (Chrome/Android) para
 * leer el QR de la entrada. Si el navegador no lo soporta (ej. Safari/iOS), se
 * puede tipear el código a mano — el flujo de validación es el mismo.
 *
 * Flujo: escanear → ver a quién pertenece → confirmar ingreso.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraOff, CheckCircle2, Loader2, QrCode, RotateCcw, XCircle, AlertTriangle } from 'lucide-react'

// `BarcodeDetector` es nativo del navegador y no está en los tipos de TS.
type DetectedBarcode = { rawValue: string }
type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<DetectedBarcode[]> }
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike
  }
}

type Result =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; name: string; type: string; event: string }
  | { kind: 'found'; code: string; name: string; type: string; event: string }
  | { kind: 'already'; name: string; at?: string }
  | { kind: 'pending'; name: string }
  | { kind: 'rejected' }
  | { kind: 'not_found' }
  | { kind: 'error'; msg: string }

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef<number | null>(null)
  const busyRef = useRef(false)

  const [scanning, setScanning] = useState(false)
  const [supported, setSupported] = useState(true)
  const [camError, setCamError] = useState('')
  const [manual, setManual] = useState('')
  const [result, setResult] = useState<Result>({ kind: 'idle' })

  /** Consulta el código (confirm=false) o confirma el ingreso (confirm=true). */
  const check = useCallback(async (code: string, confirm: boolean) => {
    setResult({ kind: 'checking' })
    try {
      const res = await fetch('/api/admin/entradas/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), confirm }),
      })
      const d = await res.json()
      if (!res.ok) { setResult({ kind: 'error', msg: d.error ?? 'Error al validar' }); return }

      // Los `result` que devuelve /api/admin/entradas/validar.
      const t = d.ticket ?? {}
      switch (d.result) {
        case 'not_found': setResult({ kind: 'not_found' }); break
        case 'rejected': setResult({ kind: 'rejected' }); break
        case 'pending': setResult({ kind: 'pending', name: t.customerName ?? '' }); break
        case 'already_used': setResult({ kind: 'already', name: t.customerName ?? '', at: t.checkedInAt }); break
        case 'checked_in': // confirmado: ya lo dejamos pasar
          setResult({ kind: 'ok', name: t.customerName ?? '', type: t.ticketTypeName ?? '', event: t.eventTitle ?? '' })
          break
        case 'valid': // válida pero todavía sin confirmar → mostramos y pedimos confirmación
          setResult({ kind: 'found', code: code.trim(), name: t.customerName ?? '', type: t.ticketTypeName ?? '', event: t.eventTitle ?? '' })
          break
        default: setResult({ kind: 'error', msg: 'Respuesta inesperada' })
      }
    } catch {
      setResult({ kind: 'error', msg: 'Error de conexión' })
    }
  }, [])

  /** Apaga la cámara y el bucle de detección. */
  const stopCamera = useCallback(() => {
    if (loopRef.current) { window.clearInterval(loopRef.current); loopRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  /** Enciende la cámara trasera y empieza a buscar QRs. */
  const startCamera = useCallback(async () => {
    setCamError('')
    setResult({ kind: 'idle' })

    if (typeof window === 'undefined' || !window.BarcodeDetector) {
      setSupported(false)
      setCamError('Este navegador no puede escanear. Usá Chrome en Android, o escribí el código a mano.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      loopRef.current = window.setInterval(async () => {
        if (busyRef.current || !videoRef.current || videoRef.current.readyState < 2) return
        busyRef.current = true
        try {
          const codes = await detector.detect(videoRef.current)
          const raw = codes[0]?.rawValue?.trim()
          if (raw) {
            stopCamera()
            await check(raw, false) // primero mostramos de quién es
          }
        } catch { /* frame sin QR: seguimos */ } finally {
          busyRef.current = false
        }
      }, 400)
    } catch (err) {
      console.error('[scan] cámara:', err)
      // Mensaje según el motivo real (así sabés qué hacer, en vez de un genérico).
      const name = (err as { name?: string })?.name ?? ''
      const msg =
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Bloqueaste el permiso de cámara. Tocá el candado 🔒 en la barra de direcciones y permití la Cámara, luego recargá.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'No encontré ninguna cámara en este dispositivo.'
            : name === 'NotReadableError'
              ? 'La cámara está siendo usada por otra app. Cerrala y volvé a intentar.'
              : 'No pude abrir la cámara. Probá recargar la página.'
      setCamError(msg)
      setScanning(false)
    }
  }, [check, stopCamera])

  // Apagar la cámara al salir de la página.
  useEffect(() => () => stopCamera(), [stopCamera])


  const reset = () => { setResult({ kind: 'idle' }); setManual('') }

  // ── Paleta CLARA de la app (fondo #EEF2F7, tarjetas blancas, degradado de marca) ──
  const BRAND = 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)'
  const PAGE_BG = '#EEF2F7'
  const SURFACE = '#FFFFFF'
  const BORDER = '#E4E9F0'

  // Texto oscuro sobre claro → siempre legible.
  const TXT = '#111827'
  const TXT_SOFT = '#4B5563'
  const TXT_LABEL = '#6B7280'

  const CARD: React.CSSProperties = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 18,
    padding: 22,
    textAlign: 'center',
    boxShadow: '0 6px 24px rgba(17,24,39,0.07)',
  }
  const LABEL: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, color: TXT_LABEL,
    textTransform: 'uppercase', letterSpacing: 1.4, margin: 0,
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: TXT, padding: 20 }}>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,229,208,0.28)', flexShrink: 0 }}>
            <QrCode size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: TXT }}>Check-in en la puerta</h1>
            <p style={{ fontSize: 12.5, color: TXT_SOFT, margin: '2px 0 0' }}>Escaneá el QR de la entrada</p>
          </div>
        </div>

        <div style={{ height: 1, background: BORDER, margin: '16px 0 18px' }} />

        {/* Cámara */}
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#000', aspectRatio: '1/1', marginBottom: 12, display: scanning ? 'block' : 'none', border: `1px solid ${BORDER}`, boxShadow: '0 6px 24px rgba(17,24,39,0.10)' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: '18%', border: '3px solid #1fb8bb', borderRadius: 18, boxShadow: '0 0 0 9999px rgba(0,0,0,0.42), 0 0 24px rgba(0,229,208,0.5)' }} />
          <p style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
            Apuntá al QR de la entrada
          </p>
        </div>

        {!scanning && result.kind === 'idle' && (
          <button
            onClick={startCamera}
            style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 15, color: '#fff', background: BRAND, boxShadow: '0 12px 28px rgba(0,229,208,0.26)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <QrCode size={19} /> Escanear con la cámara
          </button>
        )}

        {scanning && (
          <button onClick={stopCamera} style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: `1px solid ${BORDER}`, background: SURFACE, color: TXT_SOFT, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CameraOff size={16} /> Detener cámara
          </button>
        )}

        {camError && (
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: '#FFF7E6', border: '1px solid #F5A623', display: 'flex', gap: 8 }}>
            <AlertTriangle size={16} color="#B26A00" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#7A4A00', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>{camError}</p>
          </div>
        )}

        {/* Código a mano (plan B si no hay cámara) */}
        {!scanning && (
          <div style={{ marginTop: 18 }}>
            <p style={LABEL}>O escribí el código</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
              <input
                value={manual}
                onChange={e => setManual(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter' && manual.trim()) check(manual, false) }}
                placeholder="12345678"
                style={{ flex: 1, padding: '13px 14px', borderRadius: 12, background: SURFACE, border: `1px solid ${BORDER}`, color: TXT, fontSize: 16, outline: 'none', letterSpacing: 3, fontWeight: 800 }}
              />
              <button
                onClick={() => manual.trim() && check(manual, false)}
                disabled={!manual.trim()}
                style={{ padding: '0 20px', borderRadius: 12, border: 'none', cursor: manual.trim() ? 'pointer' : 'default', fontWeight: 900, fontSize: 14, color: '#fff', background: manual.trim() ? BRAND : '#C7CDD6' }}
              >
                Buscar
              </button>
            </div>
            {!supported && <p style={{ fontSize: 12, color: TXT_SOFT, margin: '8px 0 0' }}>Tu navegador no soporta el escáner. Usá Chrome en Android.</p>}
          </div>
        )}

        {/* Resultado */}
        <div style={{ marginTop: 20 }}>
          {result.kind === 'checking' && (
            <div style={{ ...CARD, display: 'flex', justifyContent: 'center' }}><Loader2 size={24} className="animate-spin" color="#00E5D0" /></div>
          )}

          {result.kind === 'found' && (
            <div style={CARD}>
              <p style={LABEL}>Entrada válida</p>
              <p style={{ fontSize: 24, fontWeight: 900, margin: '10px 0 3px', color: TXT }}>{result.name}</p>
              <p style={{ fontSize: 14, color: '#00E5D0', fontWeight: 800, margin: 0 }}>{result.type}</p>
              <p style={{ fontSize: 13, color: TXT_SOFT, margin: '3px 0 18px' }}>{result.event}</p>
              <button
                onClick={() => check(result.code, true)}
                style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 15.5, color: '#fff', background: '#16a34a', boxShadow: '0 10px 26px rgba(22,163,74,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <CheckCircle2 size={19} /> Confirmar ingreso
              </button>
            </div>
          )}

          {result.kind === 'ok' && (
            <div style={{ ...CARD, borderColor: '#16a34a', background: '#ECFDF3' }}>
              <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#064E3B' }}>¡Adelante, {result.name}!</p>
              <p style={{ fontSize: 14, color: '#15803d', fontWeight: 800, margin: '5px 0 0' }}>Ingreso confirmado ✅</p>
              <p style={{ fontSize: 13, color: '#3F6212', margin: '3px 0 0' }}>{result.type}</p>
            </div>
          )}

          {result.kind === 'already' && (
            <div style={{ ...CARD, borderColor: '#F5A623', background: '#FFF7E6' }}>
              <AlertTriangle size={44} color="#B26A00" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#7A4A00' }}>Ya ingresó</p>
              <p style={{ fontSize: 13.5, color: '#8A5A10', margin: '5px 0 0', fontWeight: 600 }}>
                {result.name}{result.at ? ` — ${new Date(result.at).toLocaleTimeString('es-BO')}` : ''}
              </p>
            </div>
          )}

          {result.kind === 'pending' && (
            <div style={{ ...CARD, borderColor: '#F5A623', background: '#FFF7E6' }}>
              <AlertTriangle size={44} color="#B26A00" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#7A4A00' }}>Pago sin aprobar</p>
              <p style={{ fontSize: 13.5, color: '#8A5A10', margin: '5px 0 0', fontWeight: 600 }}>
                {result.name} — aprobá la compra en el panel antes de dejarlo pasar.
              </p>
            </div>
          )}

          {(result.kind === 'not_found' || result.kind === 'rejected') && (
            <div style={{ ...CARD, borderColor: '#ef4444', background: '#FEF2F2' }}>
              <XCircle size={44} color="#dc2626" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#7F1D1D' }}>
                {result.kind === 'rejected' ? 'Entrada rechazada' : 'Entrada no encontrada'}
              </p>
              <p style={{ fontSize: 13.5, color: '#9B1C1C', margin: '5px 0 0', fontWeight: 600 }}>No dejes pasar a esta persona.</p>
            </div>
          )}

          {result.kind === 'error' && (
            <div style={{ ...CARD, borderColor: '#ef4444', background: '#FEF2F2' }}>
              <p style={{ fontSize: 14, color: '#9B1C1C', margin: 0, fontWeight: 700 }}>{result.msg}</p>
            </div>
          )}

          {result.kind !== 'idle' && result.kind !== 'checking' && (
            <button
              onClick={() => { reset(); startCamera() }}
              style={{ width: '100%', marginTop: 12, padding: '13px 0', borderRadius: 14, border: `1px solid ${BORDER}`, background: SURFACE, color: TXT, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <RotateCcw size={16} /> Escanear otra entrada
            </button>
          )}
        </div>

        {/* Volver */}
        <a href="/admin/entradas" style={{ display: 'block', textAlign: 'center', marginTop: 22, fontSize: 13, color: TXT_SOFT, textDecoration: 'none', fontWeight: 700 }}>
          ← Volver a Entradas
        </a>
      </div>
    </div>
  )
}
