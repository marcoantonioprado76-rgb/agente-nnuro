'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bot,
  Plus,
  Settings,
  Trash2,
  Power,
  Loader2,
  Sparkles,
  MessageSquare,
  Wifi,
  WifiOff,
  Zap,
  Activity,
  Brain,
  ShoppingBag,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Bot as BotType } from '@/types';

interface BotMetrics {
  totalConversations: number;
  totalSales: number;
  activeFollowups: number;
}

export default function BotsPage() {
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotDescription, setNewBotDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<BotMetrics>({ totalConversations: 0, totalSales: 0, activeFollowups: 0 });

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots');
      if (res.ok) {
        const data = await res.json();
        setBots(data);
      }
    } catch (err) {
      console.error('Error fetching bots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setMetrics({
          totalConversations: data.total_conversations || 0,
          totalSales: data.confirmed_orders || 0,
          activeFollowups: data.total_leads || 0,
        });
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchBots();
    fetchMetrics();
  }, []);

  const handleCreateBot = async () => {
    if (!newBotName.trim()) {
      toast.error('El nombre del bot es obligatorio');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBotName.trim(), description: newBotDescription.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setBots((prev) => [data, ...prev]);
        setNewBotName('');
        setNewBotDescription('');
        setDialogOpen(false);
        toast.success('Agente creado exitosamente');
      } else {
        toast.error(data.error || 'Error al crear el agente');
      }
    } catch {
      toast.error('Error de conexion');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    setTogglingId(id);
    try {
      const bot = bots.find(b => b.id === id);
      const res = await fetch(`/api/bots/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !bot?.is_active }),
      });
      if (res.ok) {
        setBots((prev) =>
          prev.map((b) => b.id === id ? { ...b, is_active: !b.is_active } : b)
        );
        toast.success('Estado actualizado');
      } else {
        toast.error('Error al actualizar estado');
      }
    } catch {
      toast.error('Error de conexion');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteBot = async (id: string) => {
    if (!confirm('¿Eliminar este agente? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/bots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBots((prev) => prev.filter((bot) => bot.id !== id));
        toast.success('Agente eliminado');
      } else {
        toast.error('Error al eliminar agente');
      }
    } catch {
      toast.error('Error de conexion');
    } finally {
      setDeletingId(null);
    }
  };

  const activeBots = bots.filter(b => b.is_active).length;

  const getBotStatus = (bot: BotType) => {
    const hasApiKey = !!bot.openai_api_key && bot.openai_api_key !== 'your_openai_api_key';
    const waSession = bot.whatsapp_sessions;
    const waConnected = waSession && (
      Array.isArray(waSession) ? waSession[0]?.status === 'connected' : waSession.status === 'connected'
    );
    if (!bot.is_active) return 'inactive';
    if (!hasApiKey || !bot.gpt_model) return 'pending';
    if (waConnected) return 'connected';
    return 'active';
  };

  const statusConfig = {
    connected: { label: 'Conectado', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
    active: { label: 'Activo', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)' },
    pending: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
    inactive: { label: 'Inactivo', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.12)' },
  };

  if (loading) {
    return (
      <>
        <Navbar title="Agentes IA" description="Panel de agentes inteligentes" />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(139, 92, 246, 0.15)', borderTopColor: '#8B5CF6' }}
              />
              <Brain className="absolute inset-0 m-auto h-6 w-6 text-[#8B5CF6]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Cargando agentes...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title="Agentes IA" description="Panel de agentes inteligentes" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* ── HERO HEADER ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 md:p-6 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))',
            border: '1px solid rgba(139, 92, 246, 0.08)',
          }}
        >
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent)' }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.25), transparent)' }}
          />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                  boxShadow: '0 6px 24px rgba(139, 92, 246, 0.3)',
                }}
              >
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  Mis Agentes IA
                  <span
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                  >
                    {bots.length}
                  </span>
                </h1>
                <p className="text-sm text-[#94A3B8] mt-0.5">Centro de control de agentes inteligentes de ventas</p>
              </div>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-11 px-6 text-sm font-semibold text-white rounded-xl shrink-0"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Agente
              <Sparkles className="ml-2 h-3.5 w-3.5 opacity-70" />
            </Button>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Agentes Activos', value: `${activeBots}/${bots.length}`, icon: Bot, color: '#10B981' },
              { label: 'Conversaciones', value: metrics.totalConversations, icon: MessageSquare, color: '#8B5CF6' },
              { label: 'Ventas', value: metrics.totalSales, icon: ShoppingBag, color: '#A78BFA' },
              { label: 'Seguimientos', value: metrics.activeFollowups, icon: Activity, color: '#F59E0B' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                  style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}20` }}
                >
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-none">{stat.value}</p>
                  <p className="text-[10px] text-[#94A3B8]/70 mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bot Cards */}
        {bots.length === 0 ? (
          /* Empty State */
          <div
            className="relative overflow-hidden rounded-2xl p-8 sm:p-12 animate-fade-in-up-delay-2"
            style={{
              background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.8), rgba(22, 32, 51, 0.6))',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div
              className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[100px] opacity-25"
              style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent)' }}
            />
            <div
              className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-[100px] opacity-15"
              style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15), transparent)' }}
            />

            <div className="relative text-center space-y-5">
              <div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.08))',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  boxShadow: '0 0 32px rgba(139, 92, 246, 0.1)',
                }}
              >
                <Brain className="h-10 w-10 text-[#8B5CF6]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Crea tu primer Agente de Ventas
                </h3>
                <p className="text-[#94A3B8] max-w-md mx-auto mt-2 text-sm leading-relaxed">
                  Tu agente IA atendera a tus clientes por WhatsApp las 24 horas,
                  contestando preguntas y cerrando ventas automaticamente.
                </p>
              </div>
              <Button
                onClick={() => setDialogOpen(true)}
                className="h-12 px-6 text-sm font-semibold text-white rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Crear mi primer agente
                <Sparkles className="ml-2 h-4 w-4 opacity-70" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up-delay-2">
            {bots.map((bot) => {
              const status = getBotStatus(bot);
              const sc = statusConfig[status];
              const hasApiKey = !!bot.openai_api_key && bot.openai_api_key !== 'your_openai_api_key';
              const waSession = bot.whatsapp_sessions;
              const waConnected = waSession && (
                Array.isArray(waSession) ? waSession[0]?.status === 'connected' : waSession.status === 'connected'
              );

              return (
                <div
                  key={bot.id}
                  className="group relative overflow-hidden rounded-2xl transition-all duration-300 glass-panel-hover"
                  style={{
                    background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {/* ── BANNER: AI Core Illustration ── */}
                  <div
                    className="relative h-44 overflow-hidden"
                    style={{
                      background: bot.is_active
                        ? 'linear-gradient(160deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.06) 50%, rgba(22, 32, 51, 0.9) 100%)'
                        : 'linear-gradient(160deg, rgba(148, 163, 184, 0.06) 0%, rgba(22, 32, 51, 0.9) 100%)',
                    }}
                  >
                    {/* Ambient glow orbs */}
                    <div
                      className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-[70px] pointer-events-none"
                      style={{ background: sc.color, opacity: bot.is_active ? 0.2 : 0.08 }}
                    />
                    <div
                      className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full blur-[50px] opacity-15 pointer-events-none"
                      style={{ background: '#A78BFA' }}
                    />

                    {/* Circuit pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.04]">
                      <svg className="w-full h-full" viewBox="0 0 200 160" fill="none">
                        <line x1="20" y1="20" x2="80" y2="20" stroke="white" strokeWidth="0.5" />
                        <line x1="80" y1="20" x2="80" y2="60" stroke="white" strokeWidth="0.5" />
                        <line x1="120" y1="40" x2="180" y2="40" stroke="white" strokeWidth="0.5" />
                        <line x1="120" y1="40" x2="120" y2="100" stroke="white" strokeWidth="0.5" />
                        <line x1="40" y1="100" x2="100" y2="100" stroke="white" strokeWidth="0.5" />
                        <line x1="140" y1="120" x2="180" y2="120" stroke="white" strokeWidth="0.5" />
                        <circle cx="80" cy="20" r="2" fill="white" />
                        <circle cx="120" cy="40" r="2" fill="white" />
                        <circle cx="100" cy="100" r="2" fill="white" />
                        <circle cx="140" cy="120" r="2" fill="white" />
                      </svg>
                    </div>

                    {/* ── Central AI Core Icon ── */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        {/* Outer pulse ring */}
                        <div
                          className={`absolute -inset-10 rounded-full pointer-events-none ${bot.is_active ? 'animate-pulse' : ''}`}
                          style={{
                            background: `radial-gradient(circle, ${sc.color}12, transparent 70%)`,
                          }}
                        />
                        {/* Outer glow */}
                        <div
                          className="absolute -inset-8 rounded-full blur-[28px] pointer-events-none"
                          style={{ background: `radial-gradient(circle, ${sc.color}, transparent)`, opacity: bot.is_active ? 0.2 : 0.08 }}
                        />
                        {/* Icon container */}
                        <div
                          className="relative flex h-[96px] w-[96px] items-center justify-center rounded-3xl transition-transform duration-300 group-hover:scale-105"
                          style={{
                            background: bot.is_active
                              ? `linear-gradient(145deg, ${sc.color}18, rgba(139, 92, 246, 0.06))`
                              : 'rgba(148, 163, 184, 0.06)',
                            border: `1.5px solid ${bot.is_active ? `${sc.color}30` : 'rgba(148, 163, 184, 0.1)'}`,
                            boxShadow: bot.is_active
                              ? `0 0 40px ${sc.color}15, inset 0 1px 0 rgba(255,255,255,0.06)`
                              : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                            backdropFilter: 'blur(12px)',
                          }}
                        >
                          <Brain
                            className="h-11 w-11 transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                            style={{ color: bot.is_active ? sc.color : '#94A3B8' }}
                          />
                        </div>
                        {/* Floating satellite icons */}
                        <div
                          className="absolute -top-3 -right-4 flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-translate-y-0.5"
                          style={{
                            background: waConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.08)',
                            border: `1px solid ${waConnected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(148, 163, 184, 0.1)'}`,
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          {waConnected
                            ? <Wifi className="h-3.5 w-3.5 text-[#10B981]" />
                            : <WifiOff className="h-3.5 w-3.5 text-[#94A3B8]/40" />
                          }
                        </div>
                        <div
                          className="absolute -bottom-2 -left-4 flex h-7 w-7 items-center justify-center rounded-xl transition-transform duration-300 group-hover:translate-y-0.5"
                          style={{
                            background: hasApiKey ? 'rgba(245, 158, 11, 0.12)' : 'rgba(148, 163, 184, 0.08)',
                            border: `1px solid ${hasApiKey ? 'rgba(245, 158, 11, 0.18)' : 'rgba(148, 163, 184, 0.1)'}`,
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <Zap className="h-3 w-3" style={{ color: hasApiKey ? '#F59E0B' : '#94A3B880' }} />
                        </div>
                        <div
                          className="absolute -top-1 -left-5 flex h-6 w-6 items-center justify-center rounded-lg transition-transform duration-300 group-hover:-translate-x-0.5"
                          style={{
                            background: 'rgba(167, 139, 250, 0.1)',
                            border: '1px solid rgba(167, 139, 250, 0.15)',
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <MessageSquare className="h-2.5 w-2.5 text-[#A78BFA]" />
                        </div>
                      </div>
                    </div>

                    {/* ── Top Row: Status badge + actions ── */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold backdrop-blur-md leading-none"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status === 'connected' ? 'animate-pulse' : ''}`}
                          style={{ background: sc.color }}
                        />
                        {sc.label}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleToggleStatus(bot.id)}
                          disabled={togglingId === bot.id}
                          className="flex h-6 w-6 items-center justify-center rounded-lg backdrop-blur-md transition-colors hover:bg-white/10"
                          style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                          title={bot.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {togglingId === bot.id
                            ? <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                            : <Power className="h-2.5 w-2.5" style={{ color: bot.is_active ? '#10B981' : '#94A3B8' }} />
                          }
                        </button>
                        <button
                          onClick={() => handleDeleteBot(bot.id)}
                          disabled={deletingId === bot.id}
                          className="flex h-6 w-6 items-center justify-center rounded-lg backdrop-blur-md transition-colors hover:bg-red-500/20"
                          style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        >
                          {deletingId === bot.id
                            ? <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                            : <Trash2 className="h-2.5 w-2.5 text-white" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Bottom fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, rgba(13, 21, 41, 0.95), transparent)' }} />
                  </div>

                  {/* ── BODY ── */}
                  <div className="p-5 pt-4 space-y-3.5">
                    {/* Agent name + description */}
                    <div>
                      <h3 className="text-[15px] font-semibold text-white leading-snug truncate">{bot.name}</h3>
                      {bot.description ? (
                        <p className="text-[11px] text-[#94A3B8]/60 mt-0.5 leading-relaxed line-clamp-1">{bot.description}</p>
                      ) : (
                        <p className="text-[11px] text-[#94A3B8]/40 mt-0.5">Agente de ventas con IA</p>
                      )}
                    </div>

                    {/* Info chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-[11px] font-medium"
                        style={{
                          background: waConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.025)',
                          color: waConnected ? '#10B981' : '#94A3B8',
                          border: `1px solid ${waConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)'}`,
                        }}
                      >
                        {waConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3 opacity-40" />}
                        {waConnected ? 'WhatsApp' : 'Sin conexion'}
                      </span>

                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-[11px] font-medium"
                        style={{
                          background: hasApiKey ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.025)',
                          color: hasApiKey ? '#F59E0B' : '#94A3B8',
                          border: `1px solid ${hasApiKey ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)'}`,
                        }}
                      >
                        {hasApiKey ? <Zap className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3 opacity-40" />}
                        {hasApiKey ? 'API Key' : 'Sin API Key'}
                      </span>

                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-[11px] font-medium"
                        style={{
                          background: bot.gpt_model ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.025)',
                          color: bot.gpt_model ? '#8B5CF6' : '#94A3B8',
                          border: `1px solid ${bot.gpt_model ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.04)'}`,
                        }}
                      >
                        <Brain className="h-3 w-3" />
                        {bot.gpt_model || 'Sin modelo'}
                      </span>

                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-[11px] font-medium text-[#94A3B8]/60"
                        style={{
                          background: 'rgba(255, 255, 255, 0.025)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        <Clock className="h-3 w-3" />
                        {new Date(bot.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <Link href={`/bots/${bot.id}`} className="flex-1">
                        <Button
                          className="w-full h-10 text-[13px] font-semibold text-white rounded-xl gap-2"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.1))',
                            border: '1px solid rgba(139, 92, 246, 0.15)',
                          }}
                        >
                          <Settings className="h-4 w-4" />
                          Configurar
                        </Button>
                      </Link>
                      <Link href="/conversations">
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/5 shrink-0"
                          style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
                          title="Conversaciones"
                        >
                          <MessageSquare className="h-4 w-4 text-[#06B6D4]" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(bot.id)}
                        disabled={togglingId === bot.id}
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/5 shrink-0"
                        style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
                        title={bot.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {togglingId === bot.id ? (
                          <Loader2 className="h-4 w-4 text-[#94A3B8] animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" style={{ color: bot.is_active ? '#10B981' : '#94A3B8' }} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Add New Agent Card ── */}
            <button
              onClick={() => setDialogOpen(true)}
              className="group flex flex-col items-center justify-center rounded-2xl p-8 transition-all duration-300 cursor-pointer min-h-[440px]"
              style={{
                background: 'rgba(255, 255, 255, 0.012)',
                border: '2px dashed rgba(139, 92, 246, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.025)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.1)'
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.012)'
              }}
            >
              <div className="relative mb-5">
                <div
                  className="absolute -inset-4 rounded-full opacity-20 blur-[16px] pointer-events-none"
                  style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }}
                />
                <div
                  className="relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1.5px solid rgba(139, 92, 246, 0.12)',
                    boxShadow: '0 0 24px rgba(139, 92, 246, 0.06)',
                  }}
                >
                  <Plus className="h-7 w-7 text-[#8B5CF6]" />
                </div>
              </div>
              <p className="text-sm font-semibold text-[#8B5CF6]">Nuevo Agente</p>
              <p className="text-[11px] text-[#94A3B8]/50 mt-1">Crea un nuevo agente IA</p>
            </button>
          </div>
        )}
      </div>

      {/* Create Bot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: 'linear-gradient(135deg, #111D35, #162033)',
            border: '1px solid rgba(139, 92, 246, 0.12)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}
              >
                <Brain className="h-4 w-4 text-white" />
              </div>
              Crear Nuevo Agente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bot-name" className="text-sm text-[#94A3B8]">Nombre del Agente</Label>
              <Input
                id="bot-name"
                placeholder="Ej: Ventas Principal"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                className="rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bot-description" className="text-sm text-[#94A3B8]">Descripcion</Label>
              <Input
                id="bot-description"
                placeholder="Describe la funcion del agente..."
                value={newBotDescription}
                onChange={(e) => setNewBotDescription(e.target.value)}
                className="rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
              className="rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateBot}
              disabled={creating}
              className="text-white rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              }}
            >
              {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-1.5 h-4 w-4" />
              Crear Agente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
