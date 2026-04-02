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
  Users,
  CheckCircle2,
  Smartphone,
  Store,
  BarChart3,
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/hooks/use-auth';

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
    active: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: 'rgba(16, 185, 129, 0.2)', label: 'Activa' },
    pending_followup: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)', label: 'Seguimiento' },
    closed: { bg: 'rgba(145, 137, 168, 0.08)', text: '#9189A8', border: 'rgba(145, 137, 168, 0.12)', label: 'Cerrada' },
  };
  const s = styles[status] || { bg: 'rgba(145, 137, 168, 0.08)', text: '#9189A8', border: 'rgba(145, 137, 168, 0.12)', label: status };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-[22px] text-[10px] font-semibold leading-none"
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
  const { profile } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) setData(await res.json());
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
              <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(139, 92, 246, 0.12)', borderTopColor: '#8B5CF6' }} />
              <Zap className="absolute inset-0 m-auto h-4 w-4 text-[#8B5CF6]" />
            </div>
            <p className="text-sm text-muted-foreground/60">Cargando panel...</p>
          </div>
        </div>
      </div>
    );
  }

  const d = data!;
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const conversionRate = d.total_conversations > 0 ? Math.round((d.confirmed_orders / d.total_conversations) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Navbar title="Panel Principal" description="Centro de control" />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-5 md:space-y-6">

          {/* ═══ HERO WELCOME ═══ */}
          <div className="relative overflow-hidden rounded-2xl animate-fade-in-up">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/20 via-[#EC4899]/10 to-[#06B6D4]/15" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(12,11,24,0.85), rgba(18,17,28,0.9))' }} />
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none bg-[#8B5CF6]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none bg-[#EC4899]" />

            <div className="relative p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar with glow */}
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] opacity-30 blur-sm" />
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] shadow-lg">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#EC4899] font-semibold uppercase tracking-widest mb-1">Dashboard</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Hola, {firstName}
                    </h1>
                    <p className="text-[13px] text-muted-foreground/60 mt-0.5">
                      {d.active_bots > 0
                        ? `${d.active_bots} agente${d.active_bots > 1 ? 's' : ''} vendiendo por ti ahora mismo`
                        : 'Configura tu primer agente para empezar a vender'}
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => window.location.href = '/bots'}
                    className="flex-1 sm:flex-none h-10 px-4 text-[12px] font-semibold text-white rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#9B6DF6] hover:to-[#8B5CF6] transition-all shadow-lg shadow-[#8B5CF6]/20 flex items-center justify-center gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    Mis Agentes
                  </button>
                  <button
                    onClick={() => window.location.href = '/stores'}
                    className="flex-1 sm:flex-none h-10 px-4 text-[12px] font-semibold text-white/80 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Store className="h-4 w-4" />
                    Tiendas
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ METRICS GRID ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 animate-fade-in-up-delay-1">
            {[
              { label: 'Agentes', value: d.total_bots, icon: Bot, color: '#8B5CF6', gradient: 'from-[#8B5CF6]/15 to-[#7C3AED]/5' },
              { label: 'Activos', value: d.active_bots, icon: Zap, color: '#10B981', gradient: 'from-[#10B981]/15 to-[#059669]/5' },
              { label: 'Conversaciones', value: d.total_conversations, icon: MessageSquare, color: '#06B6D4', gradient: 'from-[#06B6D4]/15 to-[#0891B2]/5' },
              { label: 'Leads', value: d.total_leads, icon: Target, color: '#F59E0B', gradient: 'from-[#F59E0B]/15 to-[#D97706]/5' },
              { label: 'Ventas', value: d.confirmed_orders, icon: ShoppingBag, color: '#EC4899', gradient: 'from-[#EC4899]/15 to-[#DB2777]/5' },
            ].map((m) => (
              <div
                key={m.label}
                className={`group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${m.gradient} border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${m.color}15`, border: `1px solid ${m.color}20` }}
                  >
                    <m.icon className="h-5 w-5" style={{ color: m.color }} />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white leading-none">{m.value}</p>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.12em] font-semibold mt-1.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* ═══ MAIN GRID ═══ */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 animate-fade-in-up-delay-2">

            {/* ── CONVERSATIONS (2 cols) ── */}
            <div className="xl:col-span-2 rounded-2xl overflow-hidden border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/15">
                    <MessageSquare className="h-4 w-4 text-[#06B6D4]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">Conversaciones Recientes</h3>
                    <p className="text-[10px] text-muted-foreground/40">Actividad de tus agentes</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/conversations'}
                  className="text-[11px] font-semibold text-[#06B6D4] hover:text-[#06B6D4]/80 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[#06B6D4]/5"
                >
                  Ver todo <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              {d.recent_conversations.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06B6D4]/5 border border-[#06B6D4]/10 mx-auto mb-4">
                    <MessageSquare className="h-7 w-7 text-[#06B6D4]/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/60">Sin conversaciones aun</p>
                  <p className="text-[11px] text-muted-foreground/30 mt-1 max-w-xs mx-auto">
                    Conecta WhatsApp en tu bot para empezar a recibir mensajes
                  </p>
                  <button
                    onClick={() => window.location.href = '/bots'}
                    className="mt-4 text-[12px] font-semibold text-[#06B6D4] hover:text-white transition-colors flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-[#06B6D4]/5 hover:bg-[#06B6D4]/10 border border-[#06B6D4]/10"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Conectar WhatsApp
                  </button>
                </div>
              ) : (
                <div>
                  {d.recent_conversations.map((conv, i) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between px-5 py-3.5 transition-all duration-200 cursor-pointer hover:bg-white/[0.02] border-b border-white/[0.02] last:border-b-0"
                      onClick={() => window.location.href = '/conversations'}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Contact avatar */}
                        <div className="relative">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full shrink-0 text-[13px] font-bold text-white"
                            style={{
                              background: `linear-gradient(135deg, ${['#8B5CF6','#06B6D4','#EC4899','#10B981','#F59E0B'][i % 5]}, ${['#7C3AED','#0891B2','#DB2777','#059669','#D97706'][i % 5]})`,
                            }}
                          >
                            {(conv.contacts?.name || conv.contacts?.push_name || 'D')[0].toUpperCase()}
                          </div>
                          {conv.status === 'active' && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#10B981] border-2 border-[#12111C]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white truncate">
                            {conv.contacts?.name || conv.contacts?.push_name || conv.contacts?.phone || 'Desconocido'}
                          </p>
                          <p className="text-[11px] text-muted-foreground/40 flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {conv.bot_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {statusBadge(conv.status)}
                        <span className="text-[10px] text-muted-foreground/30 w-8 text-right font-medium tabular-nums">
                          {conv.last_message_at ? timeAgo(conv.last_message_at) : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-5">

              {/* Bots summary */}
              <div className="rounded-2xl overflow-hidden border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/15">
                      <Brain className="h-4 w-4 text-[#8B5CF6]" />
                    </div>
                    <h3 className="text-[14px] font-semibold text-white">Mis Agentes</h3>
                  </div>
                  <button
                    onClick={() => window.location.href = '/bots'}
                    className="text-[11px] font-semibold text-[#8B5CF6] hover:text-[#8B5CF6]/80 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#8B5CF6]/5"
                  >
                    Ver <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>

                {d.bots.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 mx-auto mb-3">
                      <Brain className="h-5 w-5 text-[#8B5CF6]/30" />
                    </div>
                    <p className="text-[13px] text-muted-foreground/45">Sin agentes creados</p>
                    <button
                      onClick={() => window.location.href = '/bots'}
                      className="mt-3 text-[11px] font-semibold text-[#8B5CF6] px-3 py-1.5 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/10"
                    >
                      Crear primer agente
                    </button>
                  </div>
                ) : (
                  <div>
                    {d.bots.map((bot) => (
                      <div
                        key={bot.id}
                        className="group flex items-center justify-between px-5 py-3 transition-all duration-200 cursor-pointer hover:bg-white/[0.02] border-b border-white/[0.02] last:border-b-0"
                        onClick={() => window.location.href = `/bots/${bot.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6]/15 to-[#EC4899]/10 border border-[#8B5CF6]/10">
                            <Brain className="h-4 w-4 text-[#8B5CF6]" />
                          </div>
                          <p className="text-[13px] font-medium text-white">{bot.name}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-white/10 group-hover:text-[#8B5CF6] group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance panel */}
              <div className="rounded-2xl overflow-hidden border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent p-5">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EC4899]/10 border border-[#EC4899]/15">
                    <BarChart3 className="h-4 w-4 text-[#EC4899]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">Rendimiento</h3>
                    <p className="text-[10px] text-muted-foreground/40">Resumen general</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Productos', value: d.total_products, icon: ShoppingBag, color: '#10B981' },
                    { label: 'Leads capturados', value: d.total_leads, icon: Users, color: '#F59E0B' },
                    { label: 'Ventas cerradas', value: d.confirmed_orders, icon: CheckCircle2, color: '#EC4899' },
                    { label: 'Conversion', value: `${conversionRate}%`, icon: TrendingUp, color: '#06B6D4' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl px-3.5 py-3 bg-white/[0.02] border border-white/[0.03] hover:border-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${item.color}12` }}>
                          <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                        </div>
                        <span className="text-[12px] text-muted-foreground/60">{item.label}</span>
                      </div>
                      <span className="text-[14px] font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* System status */}
              <div className="rounded-2xl overflow-hidden border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent p-5">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10B981]/10 border border-[#10B981]/15">
                    <Activity className="h-4 w-4 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">Estado</h3>
                    <p className="text-[10px] text-muted-foreground/40">Sistema en tiempo real</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Active bots bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-muted-foreground/50">Agentes activos</span>
                      <span className="text-[12px] font-bold text-white">{d.active_bots}/{d.total_bots}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: d.total_bots > 0 ? `${(d.active_bots / d.total_bots) * 100}%` : '0%',
                          background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Status rows */}
                  <div className="flex items-center justify-between py-2 border-t border-white/[0.03]">
                    <span className="text-[11px] text-muted-foreground/50">Automatizacion</span>
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: d.active_bots > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(145, 137, 168, 0.06)',
                        color: d.active_bots > 0 ? '#10B981' : '#9189A8',
                        border: `1px solid ${d.active_bots > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(145, 137, 168, 0.08)'}`,
                      }}
                    >
                      {d.active_bots > 0 ? '24/7 Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/50">Plataforma</span>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
                      </span>
                      <span className="text-[11px] font-semibold text-[#10B981]">Online</span>
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
