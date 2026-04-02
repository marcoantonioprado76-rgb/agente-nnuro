'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import {
  UserCircle,
  Loader2,
  Target,
  Star,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

interface LeadWithRelations {
  id: string;
  status: string;
  created_at: string;
  contacts?: { name?: string; push_name?: string; phone: string } | null;
  products?: { name: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  new: {
    label: 'Nuevo',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.2)',
    icon: Star,
  },
  interested: {
    label: 'Interesado',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.2)',
    icon: MessageSquare,
  },
  negotiating: {
    label: 'Negociando',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.2)',
    icon: Clock,
  },
  converted: {
    label: 'Convertido',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.2)',
    icon: CheckCircle2,
  },
  lost: {
    label: 'Perdido',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.2)',
    icon: XCircle,
  },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leads');
        if (res.ok) {
          setLeads(await res.json());
        }
      } catch {
        // Silent - leads may not exist yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar title="Leads" />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(6, 182, 212, 0.15)', borderTopColor: '#06B6D4' }} />
              <Target className="absolute inset-0 m-auto h-5 w-5 text-[#06B6D4]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Cargando leads...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title="Leads" description="Prospectos generados por tus agentes" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Hero Header */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))',
            border: '1px solid rgba(6, 182, 212, 0.08)',
          }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3), transparent)' }} />

          <div className="relative flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', boxShadow: '0 6px 24px rgba(6, 182, 212, 0.3)' }}
            >
              <Target className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Leads
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.15)' }}
                >
                  {leads.length}
                </span>
              </h1>
              <p className="text-sm text-[#94A3B8] mt-0.5">Prospectos generados automaticamente por tus agentes IA</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {leads.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center animate-fade-in-up-delay-1"
            style={{
              background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
              style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.1)' }}
            >
              <Target className="h-7 w-7 text-[#06B6D4]" />
            </div>
            <h3 className="text-lg font-bold text-white">Aun no hay leads</h3>
            <p className="text-[13px] text-[#94A3B8]/50 max-w-md mx-auto mt-2">
              Los leads se generan automaticamente cuando tus clientes muestran interes en un producto durante una conversacion con tu bot.
            </p>
            <button
              onClick={() => window.location.href = '/bots'}
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 h-10 text-[13px] font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', boxShadow: '0 4px 16px rgba(6, 182, 212, 0.25)' }}
            >
              <Target className="h-4 w-4" />
              Configurar mis bots
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
              {leads.map((lead) => {
                const sc = statusConfig[lead.status] || statusConfig.new;
                return (
                  <div key={lead.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                      style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.12)' }}
                    >
                      <UserCircle className="h-4 w-4 text-[#06B6D4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-white truncate">
                          {lead.contacts?.name || lead.contacts?.push_name || 'Desconocido'}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 h-5 text-[9px] font-semibold shrink-0"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                        >
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-[#94A3B8]/60 truncate">{lead.products?.name || '-'}</p>
                        <span className="text-[10px] text-[#94A3B8]/30">
                          {new Date(lead.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <div
                className="grid grid-cols-[1fr_0.8fr_1fr_0.7fr_0.6fr] gap-4 px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                {['Contacto', 'Telefono', 'Producto', 'Estado', 'Fecha'].map((h) => (
                  <p key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">{h}</p>
                ))}
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}>
                {leads.map((lead) => {
                  const sc = statusConfig[lead.status] || statusConfig.new;
                  const StatusIcon = sc.icon;
                  return (
                    <div
                      key={lead.id}
                      className="grid grid-cols-[1fr_0.8fr_1fr_0.7fr_0.6fr] gap-4 px-5 py-3.5 items-center transition-colors duration-200 hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
                          style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.12)' }}
                        >
                          <UserCircle className="h-4 w-4 text-[#06B6D4]" />
                        </div>
                        <span className="text-[13px] font-medium text-white truncate">
                          {lead.contacts?.name || lead.contacts?.push_name || 'Desconocido'}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#94A3B8]/60 truncate">{lead.contacts?.phone || '-'}</p>
                      <p className="text-[13px] text-[#CBD5E8] truncate">{lead.products?.name || '-'}</p>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold w-fit leading-none"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {sc.label}
                      </span>
                      <p className="text-[11px] text-[#94A3B8]/50 text-right">
                        {new Date(lead.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
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
