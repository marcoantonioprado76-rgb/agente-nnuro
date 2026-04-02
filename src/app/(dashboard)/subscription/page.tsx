'use client'

import { useState, useEffect, useCallback } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
  ArrowRight,
  RefreshCw,
  Bot,
  Package,
  MessageSquare,
  Smartphone,
  Shield,
  Sparkles,
  CalendarDays,
  Crown,
  ArrowUpRight,
} from 'lucide-react'
import type { Subscription } from '@/types'

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Activa', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', icon: CheckCircle2 },
  pending: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', icon: Clock },
  expired: { label: 'Expirada', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.12)', icon: Clock },
  cancelled: { label: 'Cancelada', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.12)', icon: ShieldAlert },
  rejected: { label: 'Rechazada', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', icon: ShieldAlert },
}

const approvalConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending_review: { label: 'Por Revisar', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
  approved: { label: 'Aprobada', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
  rejected: { label: 'Rechazada', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  suspended: { label: 'Suspendida', color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)' },
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadSubscription = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/subscriptions')
      if (res.ok) {
        setSubscription(await res.json())
      }
    } catch { /* silent */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadSubscription()
    const interval = setInterval(() => loadSubscription(), 15000)
    return () => clearInterval(interval)
  }, [loadSubscription])

  const isActive = subscription?.status === 'active' && subscription?.approval_status === 'approved'

  if (loading) {
    return (
      <>
        <Navbar title="Mi Suscripción" />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(167, 139, 250, 0.15)', borderTopColor: '#A78BFA' }} />
              <Crown className="absolute inset-0 m-auto h-5 w-5 text-[#A78BFA]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Cargando suscripcion...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar title="Mi Suscripción" description="Membresia y plan activo" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* ── HERO HEADER ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 md:p-6 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))',
            border: '1px solid rgba(167, 139, 250, 0.08)',
          }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.3), transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25), transparent)' }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                  boxShadow: '0 6px 24px rgba(167, 139, 250, 0.3)',
                }}
              >
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Mi Suscripcion</h1>
                <p className="text-sm text-[#94A3B8] mt-0.5">Gestiona tu plan, membresia y acceso a la plataforma</p>
              </div>
            </div>
            {!isActive && (
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="h-11 px-6 text-sm font-semibold text-white rounded-xl shrink-0"
                style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', boxShadow: '0 4px 16px rgba(167, 139, 250, 0.3)' }}
              >
                <Zap className="mr-2 h-4 w-4" />
                Ver Planes
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {!subscription ? (
          /* ── NO SUBSCRIPTION ── */
          <div
            className="relative overflow-hidden rounded-2xl p-8 sm:p-12 text-center animate-fade-in-up-delay-1"
            style={{
              background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.8), rgba(22, 32, 51, 0.6))',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.2), transparent)' }} />

            <div className="relative space-y-6">
              <div className="mx-auto relative w-fit">
                <div className="absolute -inset-8 rounded-full opacity-20 blur-[28px] pointer-events-none" style={{ background: 'radial-gradient(circle, #A78BFA, transparent)' }} />
                <div
                  className="relative flex h-[96px] w-[96px] items-center justify-center rounded-3xl mx-auto"
                  style={{
                    background: 'linear-gradient(145deg, rgba(167, 139, 250, 0.12), rgba(167, 139, 250, 0.04))',
                    border: '1.5px solid rgba(167, 139, 250, 0.2)',
                    boxShadow: '0 0 40px rgba(167, 139, 250, 0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  <CreditCard className="h-11 w-11 text-[#A78BFA]" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">No tienes suscripcion activa</h3>
                <p className="text-[#94A3B8] max-w-md mx-auto mt-2 text-sm leading-relaxed">
                  Adquiere un plan para acceder a todas las funcionalidades de la plataforma: bots de ventas, automatizacion por WhatsApp y mas.
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="h-12 px-8 text-sm font-semibold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', boxShadow: '0 4px 20px rgba(167, 139, 250, 0.3)' }}
              >
                <Zap className="mr-2 h-5 w-5" />
                Ver Planes Disponibles
                <Sparkles className="ml-2 h-4 w-4 opacity-70" />
              </Button>
            </div>
          </div>
        ) : (
          /* ── WITH SUBSCRIPTION ── */
          <div className="grid gap-5 lg:grid-cols-3 animate-fade-in-up-delay-1">

            {/* ── PLAN CARD (Main, 2 cols) ── */}
            <div
              className="relative overflow-hidden rounded-2xl lg:col-span-2"
              style={{
                background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Top accent */}
              <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${isActive ? '#A78BFA' : '#94A3B8'}, transparent)`, opacity: 0.5 }} />

              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {/* Plan header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-16 w-16 items-center justify-center rounded-2xl shrink-0"
                      style={{
                        background: isActive
                          ? 'linear-gradient(145deg, rgba(167, 139, 250, 0.15), rgba(124, 58, 237, 0.08))'
                          : 'rgba(148, 163, 184, 0.06)',
                        border: `1.5px solid ${isActive ? 'rgba(167, 139, 250, 0.25)' : 'rgba(148, 163, 184, 0.1)'}`,
                        boxShadow: isActive ? '0 0 32px rgba(167, 139, 250, 0.1)' : 'none',
                      }}
                    >
                      <Zap className="h-8 w-8" style={{ color: isActive ? '#A78BFA' : '#94A3B8' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold text-white">{subscription.plan?.name || 'Plan'}</h2>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold leading-none"
                          style={{
                            background: statusConfig[subscription.status]?.bg || 'rgba(148, 163, 184, 0.08)',
                            color: statusConfig[subscription.status]?.color || '#94A3B8',
                            border: `1px solid ${statusConfig[subscription.status]?.border || 'rgba(148, 163, 184, 0.12)'}`,
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusConfig[subscription.status]?.color || '#94A3B8' }} />
                          {statusConfig[subscription.status]?.label || subscription.status}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-bold text-white">${subscription.plan?.price}</span>
                        <span className="text-sm text-[#94A3B8] font-normal">/mes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan limits — visual widgets */}
                {subscription.plan && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#94A3B8]/50 mb-3">Limites de tu plan</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Bots', value: subscription.plan.max_bots, icon: Bot, color: '#8B5CF6' },
                        { label: 'Productos', value: subscription.plan.max_products, icon: Package, color: '#A78BFA' },
                        { label: 'Conversaciones', value: subscription.plan.max_conversations, icon: MessageSquare, color: '#06B6D4' },
                        { label: 'WhatsApp', value: subscription.plan.max_whatsapp_numbers, icon: Smartphone, color: '#10B981' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl p-3.5 text-center"
                          style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
                        >
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg mx-auto mb-2"
                            style={{ background: `${item.color}10`, border: `1px solid ${item.color}15` }}
                          >
                            <item.icon className="h-4 w-4" style={{ color: item.color }} />
                          </div>
                          <p className="text-xl font-bold text-white leading-none">{item.value}</p>
                          <p className="text-[10px] text-[#94A3B8]/50 mt-1">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benefits list */}
                {isActive && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#94A3B8]/50 mb-3">Beneficios activos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Agentes IA activos 24/7',
                        'Automatizacion WhatsApp',
                        'Renovacion automatica',
                        'Soporte habilitado',
                      ].map((benefit) => (
                        <div
                          key={benefit}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                          style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.06)' }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                          <span className="text-[12px] text-[#C8C2D9]">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: Status + Details ── */}
            <div className="space-y-5">

              {/* Subscription status */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.12)' }}
                    >
                      <Shield className="h-3.5 w-3.5 text-[#06B6D4]" />
                    </div>
                    <h3 className="text-[14px] font-semibold text-white">Estado</h3>
                  </div>
                </div>

                <div className="p-5 space-y-3.5">
                  {/* Status row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#94A3B8]/60">Estado</span>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold leading-none"
                      style={{
                        background: statusConfig[subscription.status]?.bg,
                        color: statusConfig[subscription.status]?.color,
                        border: `1px solid ${statusConfig[subscription.status]?.border}`,
                      }}
                    >
                      {statusConfig[subscription.status]?.label || subscription.status}
                    </span>
                  </div>

                  {/* Approval */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#94A3B8]/60">Aprobacion</span>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold leading-none"
                      style={{
                        background: approvalConfig[subscription.approval_status]?.bg,
                        color: approvalConfig[subscription.approval_status]?.color,
                        border: `1px solid ${approvalConfig[subscription.approval_status]?.border}`,
                      }}
                    >
                      {approvalConfig[subscription.approval_status]?.label || subscription.approval_status}
                    </span>
                  </div>

                  {/* Dates */}
                  {subscription.start_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#94A3B8]/60">Inicio</span>
                      <span className="text-[12px] font-medium text-white">
                        {new Date(subscription.start_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {subscription.end_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#94A3B8]/60">Vencimiento</span>
                      <span className="text-[12px] font-medium text-white">
                        {new Date(subscription.end_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#94A3B8]/60">Registrada</span>
                    <span className="text-[12px] font-medium text-[#94A3B8]">
                      {new Date(subscription.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pending review alert */}
              {subscription.approval_status === 'pending_review' && (
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(245, 158, 11, 0.02))',
                    border: '1px solid rgba(245, 158, 11, 0.12)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
                      style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.15)' }}
                    >
                      <Clock className="h-4 w-4 text-[#F59E0B]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-[#F59E0B]">Pendiente de Activacion</p>
                      <p className="text-[11px] text-[#94A3B8]/60 mt-1 leading-relaxed">
                        {subscription.payment_provider === 'stripe'
                          ? 'Tu pago esta siendo verificado con Stripe. Se activara automaticamente.'
                          : 'Tu pago esta siendo revisado. Se verifica automaticamente cada 15 segundos.'
                        }
                      </p>
                      <button
                        onClick={() => loadSubscription(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 mt-3 h-8 px-3 rounded-lg text-[11px] font-semibold transition-all duration-200"
                        style={{
                          background: 'rgba(245, 158, 11, 0.08)',
                          color: '#F59E0B',
                          border: '1px solid rgba(245, 158, 11, 0.15)',
                        }}
                      >
                        {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Verificar Estado
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Stripe active */}
              {subscription.payment_provider === 'stripe' && isActive && (
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02))',
                    border: '1px solid rgba(16, 185, 129, 0.1)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
                      style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#10B981]">Pagado con Stripe</p>
                      <p className="text-[11px] text-[#94A3B8]/50 mt-0.5">Pago verificado y suscripcion activa</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Suspended/Rejected */}
              {(subscription.approval_status === 'suspended' || subscription.approval_status === 'rejected') && (
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02))',
                    border: '1px solid rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                    >
                      <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#EF4444]">
                        {subscription.approval_status === 'suspended' ? 'Suscripcion Suspendida' : 'Suscripcion Rechazada'}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]/50 mt-0.5">Contacta al administrador o adquiere un nuevo plan.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA for non-active */}
              {!isActive && (
                <Button
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full h-11 text-sm font-semibold text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', boxShadow: '0 4px 16px rgba(167, 139, 250, 0.3)' }}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {subscription.approval_status === 'suspended' || subscription.approval_status === 'rejected'
                    ? 'Adquirir Nuevo Plan'
                    : 'Cambiar de Plan'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
