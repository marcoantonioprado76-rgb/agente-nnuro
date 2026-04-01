'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Zap,
  Target,
  MessageSquare,
  ShoppingBag,
  ArrowRight,
  ArrowUpRight,
  Brain,
  TrendingUp,
  Activity,
  Sparkles,
  BarChart3,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';

interface DashboardData {
  total_bots: number;
  active_bots: number;
  total_products: number;
  total_conversations: number;
  total_leads: number;
  confirmed_orders: number;
  recent_conversations: Array<{
    id: string;
    bot_id: string;
    bot_name: string;
    status: string;
    last_message_at: string;
    contacts?: { name?: string; push_name?: string; phone: string } | null;
  }>;
  bots: Array<{ id: string; name: string }>;
}

function statusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    active: { bg: 'rgba(16, 185, 129, 0.08)', text: '#10B981', border: 'rgba(16, 185, 129, 0.15)', label: 'Activa' },
    pending_followup: { bg: 'rgba(245, 158, 11, 0.08)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.15)', label: 'Seguimiento' },
    closed: { bg: 'rgba(136, 153, 180, 0.06)', text: '#8899B4', border: 'rgba(136, 153, 180, 0.1)', label: 'Cerrada' },
  };
  const s = styles[status] || { bg: 'rgba(136, 153, 180, 0.06)', text: '#8899B4', border: 'rgba(136, 153, 180, 0.1)', label: status };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 h-5 text-[10px] font-semibold leading-none"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.text }} />
      {s.label}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <Navbar title="Panel Principal" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(91, 138, 255, 0.12)', borderTopColor: '#5B8AFF' }}
              />
              <Zap className="absolute inset-0 m-auto h-4 w-4 text-[#5B8AFF]" />
            </div>
            <p className="text-sm text-[#8899B4]/60">Cargando panel...</p>
          </div>
        </div>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Navbar title="Panel Principal" description="Centro de control" />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4 md:space-y-5">

          {/* HERO WELCOME */}
          <div
            className="relative overflow-hidden rounded-2xl p-4 sm:p-6 animate-fade-in-up card-premium"
          >
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] opacity-[0.06] pointer-events-none hidden sm:block" style={{ background: '#5B8AFF' }} />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #5B8AFF, #38BDF8)',
                    boxShadow: '0 4px 16px rgba(91, 138, 255, 0.2)',
                  }}
                >
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">
                    Bienvenido de vuelta
                  </h1>
                  <p className="text-[12px] sm:text-[13px] text-[#8899B4]/60 mt-0.5">
                    Centro de control de ventas con IA
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/bots'}
                className="h-9 sm:h-10 px-4 sm:px-5 text-[12px] sm:text-[13px] font-semibold text-white rounded-xl shrink-0 btn-premium-primary gap-2 w-full sm:w-auto"
              >
                <Brain className="h-4 w-4" />
                Mis Agentes
                <Sparkles className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </div>
          </div>

          {/* METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fade-in-up-delay-1">
            {[
              { label: 'Total Bots', value: d.total_bots, icon: Bot, color: '#5B8AFF' },
              { label: 'Bots Activos', value: d.active_bots, icon: Zap, color: '#10B981' },
              { label: 'Conversaciones', value: d.total_conversations, icon: MessageSquare, color: '#38BDF8' },
              { label: 'Leads', value: d.total_leads, icon: Target, color: '#F59E0B' },
              { label: 'Ventas', value: d.confirmed_orders, icon: ShoppingBag, color: '#A78BFA' },
            ].map((m) => (
              <div
                key={m.label}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-4 card-premium"
              >
                <div className="flex items-center gap-2.5 sm:flex-col sm:items-start sm:gap-0">
                  <div
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl shrink-0 sm:mb-3"
                    style={{
                      background: `${m.color}0D`,
                      border: `1px solid ${m.color}15`,
                    }}
                  >
                    <m.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" style={{ color: m.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-white leading-none">{m.value}</p>
                    <p className="text-[9px] sm:text-[10px] text-[#8899B4]/50 uppercase tracking-[0.08em] sm:tracking-[0.1em] font-semibold mt-0.5 sm:mt-1.5 truncate">{m.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* MAIN CONTENT: 3-column layout */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 animate-fade-in-up-delay-2">

            {/* CONVERSATIONS PANEL (2 cols) */}
            <div className="xl:col-span-2 rounded-2xl overflow-hidden card-premium">
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.1)' }}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-[#38BDF8]" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-white">Conversaciones Recientes</h3>
                  {d.recent_conversations.length > 0 && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(56, 189, 248, 0.08)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.1)' }}
                    >
                      {d.recent_conversations.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => window.location.href = '/conversations'}
                  className="text-[11px] font-medium text-[#8899B4]/50 hover:text-[#38BDF8] transition-colors duration-200 flex items-center gap-1"
                >
                  Ver todo <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              {d.recent_conversations.length === 0 ? (
                <div className="relative py-16 text-center overflow-hidden">
                  <div className="absolute top-0 right-0 w-60 h-60 rounded-full blur-[80px] opacity-[0.04] pointer-events-none" style={{ background: '#38BDF8' }} />
                  <div className="relative">
                    <div className="mx-auto relative w-fit mb-4">
                      <div
                        className="relative flex h-14 w-14 items-center justify-center rounded-2xl mx-auto"
                        style={{
                          background: 'rgba(56, 189, 248, 0.06)',
                          border: '1px solid rgba(56, 189, 248, 0.1)',
                        }}
                      >
                        <MessageSquare className="h-6 w-6 text-[#38BDF8]/50" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-[#8899B4]/60">Sin conversaciones aun</p>
                    <p className="text-[11px] text-[#8899B4]/35 mt-1 max-w-xs mx-auto">
                      Las conversaciones apareceran cuando tus clientes escriban al WhatsApp conectado
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}>
                  {d.recent_conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 transition-colors duration-200 cursor-pointer hover:bg-white/[0.015] active:bg-white/[0.03]"
                      onClick={() => window.location.href = '/conversations'}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
                          style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.08)' }}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-[#38BDF8]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white truncate">
                            {conv.contacts?.name || conv.contacts?.push_name || conv.contacts?.phone || 'Desconocido'}
                          </p>
                          <p className="text-[11px] text-[#8899B4]/40">{conv.bot_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {statusBadge(conv.status)}
                        <span className="text-[11px] text-[#8899B4]/35 w-8 text-right font-medium">
                          {conv.last_message_at ? timeAgo(conv.last_message_at) : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5">

              {/* Bots summary */}
              <div className="rounded-2xl overflow-hidden card-premium">
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: 'rgba(91, 138, 255, 0.08)', border: '1px solid rgba(91, 138, 255, 0.1)' }}
                    >
                      <Brain className="h-3.5 w-3.5 text-[#5B8AFF]" />
                    </div>
                    <h3 className="text-[14px] font-semibold text-white">Mis Agentes</h3>
                  </div>
                  <button
                    onClick={() => window.location.href = '/bots'}
                    className="text-[11px] font-medium text-[#8899B4]/50 hover:text-[#5B8AFF] transition-colors duration-200 flex items-center gap-1"
                  >
                    Ver <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>

                {d.bots.length === 0 ? (
                  <div className="py-10 text-center">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl mx-auto mb-3"
                      style={{ background: 'rgba(91, 138, 255, 0.06)', border: '1px solid rgba(91, 138, 255, 0.08)' }}
                    >
                      <Brain className="h-5 w-5 text-[#5B8AFF]/40" />
                    </div>
                    <p className="text-[13px] text-[#8899B4]/45">Sin agentes creados</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}>
                    {d.bots.map((bot) => (
                      <div
                        key={bot.id}
                        className="group flex items-center justify-between px-5 py-3 transition-colors duration-200 cursor-pointer hover:bg-white/[0.015]"
                        onClick={() => window.location.href = `/bots/${bot.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200"
                            style={{ background: 'rgba(91, 138, 255, 0.06)', border: '1px solid rgba(91, 138, 255, 0.08)' }}
                          >
                            <Brain className="h-3.5 w-3.5 text-[#5B8AFF]" />
                          </div>
                          <p className="text-[13px] font-medium text-white">{bot.name}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[#8899B4]/15 group-hover:text-[#5B8AFF] group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance panel */}
              <div className="rounded-2xl p-5 card-premium">
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(167, 139, 250, 0.08)', border: '1px solid rgba(167, 139, 250, 0.1)' }}
                  >
                    <BarChart3 className="h-3.5 w-3.5 text-[#A78BFA]" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-white">Rendimiento</h3>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: 'Productos en catalogo', value: d.total_products, icon: ShoppingBag, color: '#10B981' },
                    { label: 'Leads capturados', value: d.total_leads, icon: Users, color: '#F59E0B' },
                    { label: 'Ventas cerradas', value: d.confirmed_orders, icon: CheckCircle2, color: '#A78BFA' },
                    { label: 'Tasa de conversion', value: d.total_conversations > 0 ? `${Math.round((d.confirmed_orders / d.total_conversations) * 100)}%` : '0%', icon: TrendingUp, color: '#38BDF8' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
                      style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255, 255, 255, 0.03)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                        <span className="text-[12px] text-[#8899B4]/60">{item.label}</span>
                      </div>
                      <span className="text-[13px] font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* System status */}
              <div className="rounded-2xl p-5 card-premium">
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.1)' }}
                  >
                    <Activity className="h-3.5 w-3.5 text-[#10B981]" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-white">Estado del sistema</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8899B4]/50">Agentes activos</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${d.active_bots > 0 ? 'bg-[#10B981] animate-pulse' : 'bg-[#8899B4]/25'}`} />
                      <span className="text-[12px] font-semibold text-white">{d.active_bots}/{d.total_bots}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8899B4]/50">Automatizacion</span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: d.active_bots > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(136, 153, 180, 0.06)',
                        color: d.active_bots > 0 ? '#10B981' : '#8899B4',
                        border: `1px solid ${d.active_bots > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(136, 153, 180, 0.08)'}`,
                      }}
                    >
                      {d.active_bots > 0 ? 'Operando 24/7' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8899B4]/50">Plataforma</span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                      <span className="text-[12px] font-semibold text-[#10B981]">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
