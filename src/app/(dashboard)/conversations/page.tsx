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
} from 'lucide-react';

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
                <button
                  onClick={refreshMessages}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.05]"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  title="Actualizar mensajes"
                >
                  <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#94A3B8] ${loadingMessages ? 'animate-spin' : ''}`} />
                </button>
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

          {/* Messages */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
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
              <div className="p-3 sm:p-4 space-y-3 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                {messages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className="max-w-[75%] rounded-2xl px-4 py-2.5"
                        style={{
                          background: isBot
                            ? 'rgba(139, 92, 246, 0.08)'
                            : 'rgba(16, 185, 129, 0.08)',
                          border: `1px solid ${isBot ? 'rgba(139, 92, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)'}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {isBot ? (
                            <Bot className="h-3 w-3 text-[#8B5CF6]" />
                          ) : (
                            <User className="h-3 w-3 text-emerald-400" />
                          )}
                          <span className={`text-[9px] font-semibold uppercase tracking-wider ${isBot ? 'text-[#8B5CF6]/60' : 'text-emerald-400/60'}`}>
                            {isBot ? 'Bot' : 'Cliente'}
                          </span>
                          <span className="text-[9px] text-[#94A3B8]/30">
                            {new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
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
