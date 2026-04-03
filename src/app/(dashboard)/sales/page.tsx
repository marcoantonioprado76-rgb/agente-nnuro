'use client';

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShoppingBag,
  Bot,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ArrowUpRight,
  Receipt,
  MapPin,
  Phone,
  User,
  MessageSquare,
  FileText,
  CalendarDays,
  Hash,
  Loader2,
  ChevronRight,
  X,
} from 'lucide-react';

interface OrderWithRelations {
  id: string;
  bot_id: string;
  contact_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  currency: string;
  status: string;
  shipping_address?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  conversation_id?: string | null;
  conversation_summary?: string | null;
  contacts?: { id: string; name?: string; push_name?: string; phone: string } | null;
  products?: { id: string; name: string; price_unit?: number; currency?: string } | null;
  bots?: { id: string; name: string; report_phone?: string } | null;
}

interface ChatMessage {
  id: string;
  sender: 'client' | 'bot';
  type: string;
  content: string;
  created_at: string;
}

/**
 * Formatea un phone de contacto para mostrar al usuario.
 * Si es un LID de WhatsApp (>15 digitos), lo oculta.
 * Si es un numero normal, lo formatea con +prefijo.
 */
function formatPhone(phone?: string | null): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  // LID de WhatsApp: numeros internos de 13+ digitos que no son telefonos reales
  if (clean.length >= 13) return '';
  // Agregar + y separar codigo de pais del numero local
  if (clean.startsWith('591')) return `+591 ${clean.slice(3)}`;
  if (clean.startsWith('52')) return `+52 ${clean.slice(2)}`;
  if (clean.startsWith('54')) return `+54 ${clean.slice(2)}`;
  if (clean.startsWith('55')) return `+55 ${clean.slice(2)}`;
  if (clean.startsWith('56')) return `+56 ${clean.slice(2)}`;
  if (clean.startsWith('57')) return `+57 ${clean.slice(2)}`;
  if (clean.startsWith('51')) return `+51 ${clean.slice(2)}`;
  if (clean.startsWith('593')) return `+593 ${clean.slice(3)}`;
  if (clean.startsWith('595')) return `+595 ${clean.slice(3)}`;
  if (clean.startsWith('598')) return `+598 ${clean.slice(3)}`;
  if (clean.startsWith('1') && clean.length <= 11) return `+1 ${clean.slice(1)}`;
  return `+${clean}`;
}

/**
 * Intenta extraer el telefono real del CLIENTE de las notas o resumen.
 * Excluye el numero del bot para nunca confundirlos.
 */
function extractPhoneFromNotes(notes?: string | null, summary?: string | null, botPhone?: string | null): string | null {
  const text = [notes, summary].filter(Boolean).join(' ');
  if (!text) return null;

  // Extraer los ultimos 8 digitos del telefono del bot para excluirlo
  const botLocal = botPhone?.replace(/\D/g, '').slice(-8) || '';

  // Buscar TODOS los numeros de 8 digitos que empiecen con 6 o 7 (Bolivia)
  const matches = text.match(/(?:\+?591\s?)?([67]\d{7})/g);
  if (!matches) return null;

  for (const m of matches) {
    const digits = m.replace(/\D/g, '').slice(-8);
    // Saltar si es el numero del bot
    if (botLocal && digits === botLocal) continue;
    return `+591 ${digits}`;
  }
  return null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', icon: Clock },
  confirmed: { label: 'Confirmada', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', icon: CheckCircle2 },
  shipped: { label: 'Enviada', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', icon: Truck },
  delivered: { label: 'Entregada', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.2)', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', icon: XCircle },
};

export default function SalesPage() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBot, setFilterBot] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/orders?limit=100');
        if (res.ok) {
          const json = await res.json();
          // Support both paginated { data: [] } and legacy array response
          setOrders(Array.isArray(json) ? json : json.data || []);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Cargar mensajes cuando se abre un detalle
  useEffect(() => {
    if (!selectedOrder) {
      setChatMessages([]);
      return;
    }
    async function loadMessages() {
      setChatLoading(true);
      try {
        const res = await fetch(`/api/orders/${selectedOrder!.id}/messages`);
        if (res.ok) {
          const msgs = await res.json();
          setChatMessages(msgs);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setChatLoading(false);
      }
    }
    loadMessages();
  }, [selectedOrder]);

  // Scroll al final del chat cuando cargan mensajes
  useEffect(() => {
    if (chatMessages.length > 0 && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const botNames = Array.from(new Set(orders.map(o => o.bots?.name).filter(Boolean))) as string[];
  const filtered = filterBot === 'all' ? orders : orders.filter(o => o.bots?.name === filterBot);
  const confirmedOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'delivered' || o.status === 'shipped');
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalProducts = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  if (loading) {
    return (
      <>
        <Navbar title="Ventas Confirmadas" />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(16, 185, 129, 0.15)', borderTopColor: '#10B981' }} />
              <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-[#10B981]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Cargando ventas...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title="Ventas Confirmadas" description="Centro de resultados comerciales" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* ── HERO HEADER ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))',
            border: '1px solid rgba(16, 185, 129, 0.08)',
          }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3), transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25), transparent)' }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 6px 24px rgba(16, 185, 129, 0.3)' }}>
                <ShoppingBag className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  Ventas Confirmadas
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                    {orders.length}
                  </span>
                </h1>
                <p className="text-sm text-[#94A3B8] mt-0.5">Cierres automaticos generados por tus agentes IA</p>
              </div>
            </div>
            <Button
              onClick={() => window.location.href = '/bots'}
              className="h-11 px-6 text-sm font-semibold text-white rounded-xl shrink-0"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)' }}
            >
              <Bot className="mr-2 h-4 w-4" />
              Mis Agentes
              <ArrowUpRight className="ml-2 h-3.5 w-3.5 opacity-70" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Total Ventas', value: orders.length, icon: Receipt, color: '#10B981' },
              { label: 'Confirmadas', value: confirmedOrders.length, icon: CheckCircle2, color: '#06B6D4' },
              { label: 'Productos Vendidos', value: totalProducts, icon: Package, color: '#A78BFA' },
              { label: 'Ingresos', value: `${totalRevenue.toLocaleString()} ${orders[0]?.currency || 'BOB'}`, icon: DollarSign, color: '#F59E0B' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}20` }}>
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

        {/* ── FILTERS ── */}
        {botNames.length > 1 && (
          <div className="flex items-center gap-2 animate-fade-in-up-delay-1">
            <span className="text-[11px] text-[#94A3B8]/60 uppercase tracking-wider font-semibold">Filtrar:</span>
            <div className="flex gap-1.5">
              <button onClick={() => setFilterBot('all')} className="h-7 px-3 rounded-lg text-[11px] font-medium transition-all duration-200" style={{ background: filterBot === 'all' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.025)', color: filterBot === 'all' ? '#10B981' : '#94A3B8', border: `1px solid ${filterBot === 'all' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)'}` }}>
                Todos
              </button>
              {botNames.map(name => (
                <button key={name} onClick={() => setFilterBot(name)} className="h-7 px-3 rounded-lg text-[11px] font-medium transition-all duration-200" style={{ background: filterBot === name ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.025)', color: filterBot === name ? '#8B5CF6' : '#94A3B8', border: `1px solid ${filterBot === name ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)'}` }}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ORDERS TABLE ── */}
        <div className="rounded-2xl overflow-hidden animate-fade-in-up-delay-1" style={{ background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {/* Mobile cards */}
          <div className="md:hidden divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <ShoppingBag className="h-8 w-8 text-[#94A3B8]/20 mx-auto mb-3" />
                <p className="text-sm text-[#94A3B8]/50">Aun no hay ventas confirmadas</p>
              </div>
            ) : (
              filtered.map((order) => {
                const sc = statusConfig[order.status] || statusConfig.pending;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-3.5 active:bg-white/[0.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                        <ShoppingBag className="h-4 w-4 text-[#10B981]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-medium text-white truncate">
                            {order.contacts?.name || order.contacts?.push_name || 'Desconocido'}
                          </p>
                          <p className="text-[13px] font-semibold text-white shrink-0">
                            {order.total_amount?.toLocaleString()} <span className="text-[10px] text-[#94A3B8]/50 font-normal">{order.currency}</span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-[11px] text-[#94A3B8]/60 truncate">{order.products?.name || '-'}</p>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 h-5 text-[9px] font-semibold shrink-0"
                            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                          >
                            {sc.label}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#94A3B8]/30 shrink-0" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[1fr_1fr_0.8fr_0.7fr_0.7fr_0.6fr_40px] gap-4 px-5 py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              {['Cliente', 'Producto', 'Bot', 'Precio', 'Estado', 'Fecha', ''].map((h) => (
                <p key={h || 'action'} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">{h}</p>
              ))}
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}>
              {filtered.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <ShoppingBag className="h-8 w-8 text-[#94A3B8]/20 mx-auto mb-3" />
                  <p className="text-sm text-[#94A3B8]/50">Aun no hay ventas confirmadas</p>
                  <p className="text-[11px] text-[#94A3B8]/30 mt-1">Las ventas apareceran aqui cuando tus agentes cierren pedidos</p>
                </div>
              ) : (
                filtered.map((order) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="grid grid-cols-[1fr_1fr_0.8fr_0.7fr_0.7fr_0.6fr_40px] gap-4 px-5 py-3.5 items-center transition-all duration-200 hover:bg-white/[0.03] cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                          <ShoppingBag className="h-4 w-4 text-[#10B981]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white truncate">
                            {order.contacts?.name || order.contacts?.push_name || 'Desconocido'}
                          </p>
                          <p className="text-[10px] text-[#94A3B8]/50 truncate">
                            {formatPhone(order.contacts?.phone) || extractPhoneFromNotes(order.notes, order.conversation_summary, order.bots?.report_phone) || '-'}
                          </p>
                        </div>
                      </div>
                      <p className="text-[13px] text-[#CBD5E1] truncate">{order.products?.name || '-'}</p>
                      <p className="text-[13px] text-[#94A3B8]/70 truncate">{order.bots?.name || '-'}</p>
                      <p className="text-[13px] font-semibold text-white">
                        {order.total_amount?.toLocaleString()} <span className="text-[10px] text-[#94A3B8]/50 font-normal">{order.currency}</span>
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold w-fit leading-none" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {sc.label}
                      </span>
                      <p className="text-[11px] text-[#94A3B8]/50 text-right">
                        {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="flex justify-center">
                        <ChevronRight className="h-4 w-4 text-[#94A3B8]/30 group-hover:text-[#10B981] transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ORDER DETAIL DIALOG ── */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent
          showCloseButton={false}
          className="!max-w-[95vw] sm:!max-w-4xl max-h-[90vh] p-0 overflow-hidden border-0"
          style={{
            background: 'linear-gradient(180deg, #0F1A2E 0%, #0B1222 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {selectedOrder && (
            <OrderDetail
              order={selectedOrder}
              messages={chatMessages}
              messagesLoading={chatLoading}
              chatEndRef={chatEndRef}
              onClose={() => setSelectedOrder(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ══════════════════════════════════════════════════════
// ORDER DETAIL COMPONENT
// ══════════════════════════════════════════════════════
function OrderDetail({
  order,
  messages,
  messagesLoading,
  chatEndRef,
  onClose,
}: {
  order: OrderWithRelations;
  messages: ChatMessage[];
  messagesLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const sc = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = sc.icon;
  const clientName = order.contacts?.name || order.contacts?.push_name || 'Desconocido';

  return (
    <div className="flex flex-col h-[85vh] sm:h-[85vh]">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)' }}>
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Detalle de Venta
                </DialogTitle>
                <p className="text-xs text-[#94A3B8]/60 mt-0.5">
                  {new Date(order.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">
              <X className="h-4 w-4 text-[#94A3B8]" />
            </button>
          </div>
        </DialogHeader>
      </div>

      {/* Content: stacked on mobile, 2-column on desktop */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left: Order details */}
        <div className="md:w-[360px] shrink-0 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[40vh] md:max-h-none border-b md:border-b-0 md:border-r" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-[11px] font-semibold" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              <StatusIcon className="h-3 w-3" />
              {sc.label}
            </span>
            <span className="text-[10px] text-[#94A3B8]/40 font-mono">#{order.id.substring(0, 8)}</span>
          </div>

          {/* Client info */}
          <DetailSection title="Cliente" icon={User} color="#10B981">
            <DetailRow label="Nombre" value={clientName} />
            <DetailRow
              label="Telefono"
              value={formatPhone(order.contacts?.phone) || extractPhoneFromNotes(order.notes, order.conversation_summary, order.bots?.report_phone) || '-'}
            />
          </DetailSection>

          {/* Product info */}
          <DetailSection title="Producto" icon={Package} color="#A78BFA">
            <DetailRow label="Producto" value={order.products?.name || '-'} />
            <DetailRow label="Cantidad" value={String(order.quantity)} />
            <DetailRow label="Precio unitario" value={`${order.products?.currency || order.currency} ${order.products?.price_unit?.toLocaleString() || '-'}`} />
            <DetailRow label="Total" value={`${order.currency} ${order.total_amount?.toLocaleString()}`} highlight />
          </DetailSection>

          {/* Shipping info */}
          {order.shipping_address && (
            <DetailSection title="Entrega" icon={MapPin} color="#F59E0B">
              <p className="text-[12px] text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">{order.shipping_address}</p>
            </DetailSection>
          )}

          {/* Notes */}
          {order.notes && (
            <DetailSection title="Notas del Reporte" icon={FileText} color="#8B5CF6">
              <p className="text-[12px] text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">{order.notes}</p>
            </DetailSection>
          )}

          {/* AI Summary */}
          {order.conversation_summary && (
            <DetailSection title="Resumen IA" icon={Bot} color="#06B6D4">
              <p className="text-[12px] text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">{order.conversation_summary}</p>
            </DetailSection>
          )}

          {/* Bot info */}
          <DetailSection title="Agente" icon={Bot} color="#94A3B8">
            <DetailRow label="Bot" value={order.bots?.name || '-'} />
            <DetailRow label="Fecha" value={new Date(order.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          </DetailSection>
        </div>

        {/* Right: Chat conversation */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat header */}
          <div className="shrink-0 px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <MessageSquare className="h-4 w-4 text-[#10B981]" />
            <span className="text-[13px] font-semibold text-white">Conversacion</span>
            <span className="text-[10px] text-[#94A3B8]/50 ml-1">
              {messagesLoading ? 'Cargando...' : `${messages.length} mensajes`}
            </span>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 text-[#10B981] animate-spin" />
                <span className="text-sm text-[#94A3B8] ml-2">Cargando conversacion...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-8 w-8 text-[#94A3B8]/20 mb-2" />
                <p className="text-sm text-[#94A3B8]/40">No hay mensajes disponibles</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// HELPER COMPONENTS
// ══════════════════════════════════════════════════════

function DetailSection({ title, icon: Icon, color, children }: { title: string; icon: typeof User; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{title}</span>
      </div>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#94A3B8]/60">{label}</span>
      <span className={`text-[12px] font-medium text-right ${highlight ? 'text-[#10B981] font-bold text-[13px]' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isBot = message.sender === 'bot';
  const time = new Date(message.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isBot ? 'rounded-bl-md' : 'rounded-br-md'}`}
        style={{
          background: isBot
            ? 'rgba(255, 255, 255, 0.04)'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.08))',
          border: `1px solid ${isBot ? 'rgba(255, 255, 255, 0.06)' : 'rgba(16, 185, 129, 0.15)'}`,
        }}
      >
        {/* Sender label */}
        <div className="flex items-center gap-1.5 mb-1">
          {isBot ? (
            <Bot className="h-3 w-3 text-[#8B5CF6]" />
          ) : (
            <User className="h-3 w-3 text-[#10B981]" />
          )}
          <span className={`text-[9px] font-semibold uppercase tracking-wider ${isBot ? 'text-[#8B5CF6]/70' : 'text-[#10B981]/70'}`}>
            {isBot ? 'Bot' : 'Cliente'}
          </span>
          <span className="text-[9px] text-[#94A3B8]/30 ml-auto">{time}</span>
        </div>
        <p className="text-[12.5px] text-[#E2E8F0] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}
