'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, Trash2, Loader2, Phone, QrCode, RefreshCw, Smartphone, CheckCircle2, AlertCircle, Zap, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ConnectionStatus = 'connected' | 'disconnected' | 'qr_ready' | 'connecting'

interface WhatsAppTabProps {
  botId: string
}

interface SessionState {
  status: ConnectionStatus
  qr_code: string | null
  phone_number: string | null
  last_connected_at: string | null
}

function QRLoadingState() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <>
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.15)' }}
      >
        <Loader2 className="h-7 w-7 text-[#F59E0B] animate-spin" />
      </div>
      <h3 className="text-[15px] sm:text-[16px] font-bold text-white text-center">Generando codigo QR...</h3>
      <p className="text-[12px] text-[#94A3B8]/50 text-center max-w-[280px]">
        Conectando con WhatsApp. No cierres esta pantalla.
      </p>
      <span
        className="inline-flex items-center gap-1.5 rounded-lg px-3 h-7 text-[11px] font-mono text-[#F59E0B]/70"
        style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.1)' }}
      >
        {elapsed}s esperando...
      </span>
    </>
  )
}

export function WhatsAppTab({ botId }: WhatsAppTabProps) {
  const [session, setSession] = useState<SessionState>({
    status: 'disconnected',
    qr_code: null,
    phone_number: null,
    last_connected_at: null,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const status = session.status

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp?botId=${botId}`)
      if (res.ok) {
        const data = await res.json()
        setSession({
          status: data.status || 'disconnected',
          qr_code: data.qr_code || null,
          phone_number: data.phone_number || null,
          last_connected_at: data.last_connected_at || null,
        })
      }
    } catch {
      // Silent fail on polling
    }
  }, [botId])

  useEffect(() => {
    fetchStatus()
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [fetchStatus])

  useEffect(() => {
    if (status === 'connecting' || status === 'qr_ready') {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(fetchStatus, 2000)
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [status, fetchStatus])

  const [connectError, setConnectError] = useState<string | null>(null)

  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectError(null)
    // Show loading state immediately so user sees feedback
    setSession((prev) => ({ ...prev, status: 'connecting', qr_code: null }))
    try {
      const controller = new AbortController()
      const fetchTimeout = setTimeout(() => controller.abort(), 65000)
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, action: 'connect' }),
        signal: controller.signal,
      })
      clearTimeout(fetchTimeout)
      const data = await res.json()
      if (res.ok) {
        setSession((prev) => ({
          ...prev,
          status: data.qr_code ? 'qr_ready' : (data.status || 'connecting'),
          qr_code: data.qr_code || null,
        }))
        if (data.qr_code) {
          toast.success('Escanea el codigo QR con WhatsApp')
        } else if (data.status === 'connected') {
          toast.success('WhatsApp ya esta conectado')
        } else {
          // No QR received — show debug info
          const debugInfo = data.debug ? ` (${data.debug.elapsed}ms, status: ${data.debug.finalStatus})` : ''
          toast.info(`Esperando codigo QR...${debugInfo}`)
        }
      } else {
        const errorMsg = data.error || 'Error al conectar'
        toast.error(errorMsg)
        setConnectError(errorMsg)
        setSession((prev) => ({ ...prev, status: 'disconnected' }))
      }
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError'
      const errorMsg = isTimeout
        ? 'La conexion tardo demasiado. Intenta de nuevo.'
        : (err instanceof Error ? err.message : 'Error de conexion con el servidor')
      toast.error(errorMsg)
      setConnectError(errorMsg)
      setSession((prev) => ({ ...prev, status: 'disconnected' }))
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, action: 'disconnect' }),
      })
      if (res.ok) {
        setSession({
          status: 'disconnected',
          qr_code: null,
          phone_number: null,
          last_connected_at: null,
        })
        toast.success('WhatsApp desconectado correctamente')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al desconectar')
      }
    } catch {
      toast.error('Error al desconectar')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleClearMemory = async () => {
    setIsClearing(true)
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, action: 'clear_memory' }),
      })
      if (res.ok) {
        toast.success('Memoria limpiada correctamente')
      } else {
        toast.error('Error al limpiar memoria')
      }
    } catch {
      toast.error('Error al limpiar memoria')
    } finally {
      setIsClearing(false)
    }
  }

  const statusColor = status === 'connected' ? '#10B981' : status === 'connecting' || status === 'qr_ready' ? '#F59E0B' : '#EF4444'
  const statusLabel = status === 'connected' ? 'Conectado' : status === 'qr_ready' ? 'Esperando escaneo' : status === 'connecting' ? 'Conectando...' : 'Desconectado'

  return (
    <div className="space-y-5">

      {/* ── Connection Status ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 md:p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: `1px solid ${status === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
        }}
      >
        {/* Subtle glow for connected */}
        {status === 'connected' && (
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #10B981, transparent)' }} />
        )}

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl shrink-0"
              style={{
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}25`,
              }}
            >
              {status === 'connected' ? (
                <Wifi className="h-5 w-5" style={{ color: statusColor }} />
              ) : status === 'connecting' || status === 'qr_ready' ? (
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: statusColor }} />
              ) : (
                <WifiOff className="h-5 w-5" style={{ color: statusColor }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-white">WhatsApp</h2>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold"
                  style={{
                    background: `${statusColor}15`,
                    color: statusColor,
                    border: `1px solid ${statusColor}25`,
                  }}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${status === 'connected' ? 'animate-pulse' : ''}`} style={{ background: statusColor }} />
                  {statusLabel}
                </span>
              </div>
              {status === 'connected' && session.phone_number && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone className="h-3 w-3 text-[#94A3B8]/40" />
                  <span className="text-[12px] text-[#94A3B8]/60 font-mono">+{session.phone_number}</span>
                </div>
              )}
              {status === 'disconnected' && (
                <p className="text-[11px] text-[#94A3B8]/50 mt-0.5">Vincula tu cuenta para activar el agente</p>
              )}
            </div>
          </div>

          {status === 'connected' && (
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="flex items-center gap-2 rounded-lg px-3.5 h-8 text-[11px] font-medium transition-all duration-200 hover:opacity-80"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.15)',
              }}
            >
              {isDisconnecting && <Loader2 className="h-3 w-3 animate-spin" />}
              Desconectar
            </button>
          )}
        </div>
      </div>

      {/* ── QR Code Display ── */}
      {(status === 'qr_ready' || status === 'connecting') && (
        <div
          className="rounded-2xl p-4 md:p-5"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.1)',
          }}
        >
          <div className="flex flex-col items-center justify-center py-4 sm:py-6 space-y-4 sm:space-y-5">
            {session.qr_code ? (
              <>
                {/* QR Code */}
                <div
                  className="relative p-3 sm:p-4 rounded-2xl"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                >
                  <img
                    src={session.qr_code}
                    alt="Codigo QR de WhatsApp"
                    className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-xl"
                  />
                  {/* Corner accents */}
                  <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#8B5CF6]/40 rounded-tl-lg" />
                  <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#8B5CF6]/40 rounded-tr-lg" />
                  <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#8B5CF6]/40 rounded-bl-lg" />
                  <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#8B5CF6]/40 rounded-br-lg" />
                </div>

                <h3 className="text-[15px] sm:text-[16px] font-bold text-white text-center">
                  Escanea el codigo QR
                </h3>

                {/* Steps */}
                <div className="space-y-2 max-w-sm">
                  {[
                    'Abre WhatsApp en tu telefono',
                    'Toca Menu o Configuracion',
                    'Toca Dispositivos vinculados',
                    'Apunta tu telefono hacia esta pantalla',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5 sm:gap-3">
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full shrink-0 text-[9px] font-bold"
                        style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-[11px] sm:text-[12px] text-[#94A3B8]/70">{step}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={fetchStatus}
                  className="flex items-center gap-2 rounded-lg px-3.5 h-8 text-[11px] font-medium text-[#94A3B8] transition-colors hover:text-white"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Actualizar QR
                </button>
              </>
            ) : (
              <QRLoadingState />
            )}
          </div>
        </div>
      )}

      {/* ── Connect Button (disconnected) ── */}
      {status === 'disconnected' && (
        <div
          className="rounded-2xl p-4 md:p-5"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex flex-col items-center justify-center py-8 space-y-5">
            <div className="relative">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))',
                  border: '1px solid rgba(139, 92, 246, 0.12)',
                }}
              >
                <QrCode className="h-9 w-9 text-[#8B5CF6]" />
              </div>
              {/* Floating accent */}
              <div
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
              >
                <Smartphone className="h-3 w-3 text-[#06B6D4]" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-[16px] font-bold text-white">Conectar WhatsApp</h3>
              <p className="text-[12px] text-[#94A3B8]/50 mt-1.5 max-w-sm">
                Vincula tu cuenta de WhatsApp para que el agente pueda enviar y recibir mensajes automaticamente.
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-2.5 rounded-xl px-8 h-11 text-white text-[13px] font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
              }}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              Generar codigo QR
            </button>

            {connectError && (
              <div
                className="w-full max-w-sm rounded-xl p-3 text-center"
                style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertCircle className="h-3.5 w-3.5 text-[#EF4444]" />
                  <span className="text-[12px] font-semibold text-[#EF4444]">Error de conexion</span>
                </div>
                <p className="text-[11px] text-[#94A3B8]/60 break-words">{connectError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Connected Success ── */}
      {status === 'connected' && (
        <div
          className="rounded-2xl p-4 md:p-5"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
          }}
        >
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.1)',
              }}
            >
              <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
            </div>
            <div className="text-center">
              <h3 className="text-[18px] font-bold text-white">Bot conectado correctamente</h3>
              <p className="text-[12px] text-[#94A3B8]/50 mt-1">
                El agente esta activo y respondiendo mensajes en WhatsApp.
              </p>
            </div>
            {session.last_connected_at && (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-3 h-7 text-[10px] font-medium text-[#94A3B8]/50"
                style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                Conectado desde: {new Date(session.last_connected_at).toLocaleString('es-MX')}
              </span>
            )}

            {/* Features row */}
            <div className="flex flex-wrap gap-2 md:gap-3 mt-2">
              {[
                { icon: Zap, label: 'Respuestas IA', color: '#F59E0B' },
                { icon: Shield, label: 'Conexion segura', color: '#10B981' },
                { icon: Smartphone, label: 'Multi-dispositivo', color: '#8B5CF6' },
              ].map((feat) => (
                <div
                  key={feat.label}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 h-7"
                  style={{ background: `${feat.color}08`, border: `1px solid ${feat.color}12` }}
                >
                  <feat.icon className="h-3 w-3" style={{ color: feat.color }} />
                  <span className="text-[10px] text-[#94A3B8]/60 font-medium">{feat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Memory ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
            >
              <Trash2 className="h-4.5 w-4.5 text-[#EF4444]/70" />
            </div>
            <div>
              <h4 className="text-[14px] font-semibold text-white">Limpiar memoria</h4>
              <p className="text-[11px] text-[#94A3B8]/50 mt-0.5">
                Elimina el historial de conversaciones de todos los clientes.
              </p>
            </div>
          </div>

          <button
            onClick={handleClearMemory}
            disabled={isClearing}
            className="flex items-center gap-2 rounded-lg px-3.5 h-8 text-[11px] font-medium transition-all duration-200 hover:opacity-80"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#EF4444',
              border: '1px solid rgba(239, 68, 68, 0.15)',
            }}
          >
            {isClearing && <Loader2 className="h-3 w-3 animate-spin" />}
            Limpiar
          </button>
        </div>
      </div>
    </div>
  )
}
