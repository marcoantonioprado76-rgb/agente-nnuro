'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from '@/components/layout/navbar';
import {
  MessageSquare,
  Loader2,
  Bot,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Trash2,
  User,
  RefreshCw,
  Pause,
  Play,
  Eraser,
} from 'lucide-react';
import { toast } from 'sonner';

interface ConversationWithContact {
  id: string;
  bot_id: string;
  status: string;
  last_message_at: string;
  created_at: string;
  product_interest?: string;
  contacts?: { name?: string; push_name?: string; phone: string } | null;
  bots?: { name: string } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: 'bot' | 'client';
  type: string;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  active: {
    label: 'Activa',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.2)',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Cerrada',
    color: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.08)',
    border: 'rgba(148, 163, 184, 0.1)',
    icon: CheckCircle2,
  },
  pending_followup: {
    label: 'Seguimiento',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.2)',
    icon: Clock,
  },
  paused: {
    label: 'Pausado',
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.1)',
    border: 'rgba(236, 72, 153, 0.2)',
    icon: Pause,
  },
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<ConversationWithContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages?limit=200`);
      if (res.ok) {
        setMessages(await res.json());
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {
      // Silent
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const selectConversation = (conv: ConversationWithContact) => {
    setSelectedConv(conv);
    loadMessages(conv.id);
  };

  const handleDelete = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta conversacion y todos sus mensajes?')) return;

    setDeleting(convId);
    try {
      const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== convId));
        if (selectedConv?.id === convId) {
          setSelectedConv(null);
          setMessages([]);
        }
      }
    } catch {
      // Silent
    } finally {
      setDeleting(null);
    }
  };

  const refreshMessages = () => {
    if (selectedConv) loadMessages(selectedConv.id);
  };

  const handleAction = async (convId: string, action: 'pause_bot' | 'resume_bot' | 'clear_memory') => {
    try {
      const res = await fetch(`/api/conversations/${convId}/actions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        // Update local state
        const newStatus = action === 'pause_bot' ? 'paused' : action === 'resume_bot' ? 'active' : undefined;
        if (newStatus) {
          setConversations(prev => prev.map(c => c.id === convId ? { ...c, status: newStatus } : c));
          if (selectedConv?.id === convId) setSelectedConv(prev => prev ? { ...prev, status: newStatus } : prev);
        }
        if (action === 'clear_memory' && selectedConv?.id === convId) {
          setSelectedConv(prev => prev ? { ...prev, product_interest: undefined } : prev);
        }
      } else {
        toast.error(data.error || 'Error');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar title="Conversaciones" />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(139, 92, 246, 0.15)', borderTopColor: '#8B5CF6' }} />
              <MessageSquare className="absolute inset-0 m-auto h-5 w-5 text-[#8B5CF6]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Cargando conversaciones...</p>
          </div>
        </div>
      </>
    );
  }

  // Detail view
  if (selectedConv) {
    const contactDisplay = selectedConv.contacts?.name || selectedConv.contacts?.push_name || 'Desconocido';
    const sc = statusConfig[selectedConv.status] || statusConfig.active;

    return (
      <>
        <Navbar title="Conversaciones" description="Detalle de la conversacion" />
        <div className="p-4 md:p-6 space-y-4 animate-fade-in-up">
          {/* Header */}
          <div
            className="rounded-2xl p-4 md:p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))',
              border: '1px solid rgba(139, 92, 246, 0.08)',
            }}
          >
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => { setSelectedConv(null); setMessages([]); }}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.05] shrink-0"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
                >
                  <ArrowLeft className="h-4 w-4 text-[#94A3B8]" />
                </button>
                <div
                  className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shrink-0"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', boxShadow: '0 6px 24px rgba(139, 92, 246, 0.3)' }}
                >
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">{contactDisplay}</h2>
                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
                    <p className="text-[10px] sm:text-[11px] text-[#94A3B8]/60">{selectedConv.contacts?.phone || ''}</p>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 h-5 text-[9px] font-semibold"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                    >
                      {sc.label}
                    </span>
                    <p className="text-[10px] sm:text-[11px] text-[#94A3B8]/40 hidden sm:block">{selectedConv.bots?.name || 'Bot'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Pause / Resume bot */}
                <button
                  onClick={() => handleAction(selectedConv.id, selectedConv.status === 'paused' ? 'resume_bot' : 'pause_bot')}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-colors"
                  style={{
                    border: `1px solid ${selectedConv.status === 'paused' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(236, 72, 153, 0.15)'}`,
                    background: selectedConv.status === 'paused' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                  }}
                  title={selectedConv.status === 'paused' ? 'Reanudar bot' : 'Pausar bot'}
                >
                  {selectedConv.status === 'paused'
                    ? <Play className="h-3.5 w-3.5 text-[#10B981]" />
                    : <Pause className="h-3.5 w-3.5 text-[#EC4899]" />
                  }
                </button>
                {/* Clear memory */}
                <button
                  onClick={() => {
                    if (confirm('¿Eliminar la memoria de IA de este contacto?')) {
                      handleAction(selectedConv.id, 'clear_memory');
                    }
                  }}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-colors hover:bg-amber-500/10"
                  style={{ border: '1px solid rgba(245, 158, 11, 0.15)' }}
                  title="Eliminar memoria"
                >
                  <Eraser className="h-3.5 w-3.5 text-[#F59E0B]" />
                </button>
                {/* Refresh */}
                <button
                  onClick={refreshMessages}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.05]"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  title="Actualizar mensajes"
                >
                  <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#94A3B8] ${loadingMessages ? 'animate-spin' : ''}`} />
                </button>
                {/* Delete */}
                <button
                  onClick={(e) => handleDelete(selectedConv.id, e)}
                  disabled={deleting === selectedConv.id}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-colors hover:bg-red-500/10"
                  style={{ border: '1px solid rgba(239, 68, 68, 0.15)' }}
                  title="Eliminar conversacion"
                >
                  {deleting === selectedConv.id
                    ? <Loader2 className="h-3.5 w-3.5 text-red-400 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  }
                </button>
              </div>
            </div>

            {/* Memory context */}
            {selectedConv.product_interest && (
              <div
                className="mt-4 rounded-xl p-3"
                style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.08)' }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8B5CF6]/60 mb-1">Contexto IA</p>
                <p className="text-[12px] text-[#94A3B8]/70 leading-relaxed">{selectedConv.product_interest}</p>
              </div>
            )}
          </div>

          {/* Messages — WhatsApp Style */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#0B141A',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              border: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            {loadingMessages ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 text-[#8B5CF6] animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="h-8 w-8 text-[#94A3B8]/20 mx-auto mb-2" />
                <p className="text-[13px] text-[#94A3B8]/40">No hay mensajes</p>
              </div>
            ) : (
              <div className="px-3 sm:px-6 py-4 space-y-1 max-h-[55vh] sm:max-h-[65vh] overflow-y-auto">
                {messages.map((msg, idx) => {
                  const isBot = msg.sender === 'bot';
                  const time = new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                  const prevMsg = messages[idx - 1];
                  const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                  return (
                    <div key={msg.id}>
                      {/* Date separator */}
                      {showDate && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] font-medium px-3 py-1 rounded-lg bg-[#1A2A35] text-[#8696A0]">
                            {new Date(msg.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-0.5`}>
                        <div
                          className={`relative max-w-[80%] sm:max-w-[65%] px-3 py-2 ${
                            isBot
                              ? 'rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl'
                              : 'rounded-tl-2xl rounded-tr-sm rounded-br-2xl rounded-bl-2xl'
                          }`}
                          style={{
                            backgroundColor: isBot ? '#1A2C36' : '#054640',
                          }}
                        >
                          {/* Sender label (first message only) */}
                          {isBot && (idx === 0 || messages[idx - 1]?.sender !== 'bot') && (
                            <p className="text-[11px] font-semibold text-[#8B5CF6] mb-0.5 flex items-center gap-1">
                              <Bot className="h-3 w-3" /> Bot
                            </p>
                          )}
                          {!isBot && (idx === 0 || messages[idx - 1]?.sender !== 'client') && (
                            <p className="text-[11px] font-semibold text-[#25D366] mb-0.5">
                              {contactDisplay}
                            </p>
                          )}

                          {/* Content */}
                          {msg.type === 'image' && msg.content.startsWith('http') ? (
                            <img src={msg.content} alt="" className="rounded-lg max-w-full max-h-48 mb-1" />
                          ) : msg.type === 'video' && msg.content.startsWith('http') ? (
                            <video src={msg.content} controls className="rounded-lg max-w-full max-h-48 mb-1" />
                          ) : (
                            <p className="text-[13px] text-[#E9EDEF] leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}

                          {/* Time + ticks */}
                          <div className={`flex items-center gap-1 mt-0.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
                            <span className="text-[10px] text-[#8696A0]">{time}</span>
                            {isBot && (
                              <svg viewBox="0 0 16 11" className="w-4 h-3 text-[#53BDEB]" fill="currentColor">
                                <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.344.153.458.458 0 0 0 0 .611l2.357 2.457a.456.456 0 0 0 .34.178h.013a.458.458 0 0 0 .34-.153l6.516-8.07a.457.457 0 0 0 0-.64z" />
                                <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.249-.34.424 1.521 1.587a.456.456 0 0 0 .34.178h.013a.458.458 0 0 0 .34-.153l6.516-8.07a.457.457 0 0 0-.315-.429z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // List view
  return (
    <>
      <Navbar title="Conversaciones" description="Revisa las conversaciones de tus agentes con clientes" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Hero Header */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))',
            border: '1px solid rgba(139, 92, 246, 0.08)',
          }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent)' }} />

          <div className="relative flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', boxShadow: '0 6px 24px rgba(139, 92, 246, 0.3)' }}
            >
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Conversaciones
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                >
                  {conversations.length}
                </span>
              </h1>
              <p className="text-sm text-[#94A3B8] mt-0.5">Historial de interacciones automaticas con clientes</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {conversations.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center animate-fade-in-up-delay-1"
            style={{
              background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
              style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
            >
              <MessageSquare className="h-7 w-7 text-[#8B5CF6]" />
            </div>
            <h3 className="text-lg font-bold text-white">Aun no hay conversaciones</h3>
            <p className="text-[13px] text-[#94A3B8]/50 max-w-md mx-auto mt-2">
              Las conversaciones aparecen automaticamente cuando tus clientes escriben a tu bot por WhatsApp. Conecta tu numero para empezar.
            </p>
            <button
              onClick={() => window.location.href = '/bots'}
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 h-10 text-[13px] font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', boxShadow: '0 4px 16px rgba(139, 92, 246, 0.25)' }}
            >
              <Bot className="h-4 w-4" />
              Configurar un bot
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden animate-fade-in-up-delay-1"
            style={{
              background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}>
              {conversations.map((conv) => {
                const sc = statusConfig[conv.status] || statusConfig.active;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.02] cursor-pointer"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                      style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.12)' }}
                    >
                      <MessageSquare className="h-4 w-4 text-[#8B5CF6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-white truncate">
                          {conv.contacts?.name || conv.contacts?.push_name || 'Desconocido'}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 h-5 text-[9px] font-semibold shrink-0"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                        >
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-[#94A3B8]/50 truncate">{conv.bots?.name || 'Bot'}</p>
                        <span className="text-[10px] text-[#94A3B8]/30">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                            : '-'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(conv.id, e)}
                      disabled={deleting === conv.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 active:bg-red-500/10"
                    >
                      {deleting === conv.id
                        ? <Loader2 className="h-3.5 w-3.5 text-red-400 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5 text-[#94A3B8]/30" />
                      }
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <div
                className="grid grid-cols-[1fr_0.8fr_0.6fr_0.8fr_0.3fr] gap-4 px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                {['Contacto', 'Bot', 'Estado', 'Ultima actividad', ''].map((h) => (
                  <p key={h || 'actions'} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">{h}</p>
                ))}
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}>
                {conversations.map((conv) => {
                  const sc = statusConfig[conv.status] || statusConfig.active;
                  const StatusIcon = sc.icon;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className="grid grid-cols-[1fr_0.8fr_0.6fr_0.8fr_0.3fr] gap-4 px-5 py-3.5 items-center transition-colors duration-200 hover:bg-white/[0.02] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
                          style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.12)' }}
                        >
                          <MessageSquare className="h-4 w-4 text-[#8B5CF6]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white truncate">
                            {conv.contacts?.name || conv.contacts?.push_name || 'Desconocido'}
                          </p>
                          <p className="text-[10px] text-[#94A3B8]/50 truncate">{conv.contacts?.phone || ''}</p>
                        </div>
                      </div>
                      <p className="text-[13px] text-[#94A3B8]/70 truncate">{conv.bots?.name || 'Bot'}</p>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold w-fit leading-none"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {sc.label}
                      </span>
                      <p className="text-[11px] text-[#94A3B8]/50">
                        {conv.last_message_at
                          ? new Date(conv.last_message_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                          : '-'}
                      </p>
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => handleDelete(conv.id, e)}
                          disabled={deleting === conv.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
                        >
                          {deleting === conv.id
                            ? <Loader2 className="h-3.5 w-3.5 text-red-400 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5 text-[#94A3B8]/30 hover:text-red-400 transition-colors" />
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
