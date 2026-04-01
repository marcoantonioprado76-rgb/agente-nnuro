'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Key,
  FileText,
  Package,
  Clock,
  Smartphone,
  ArrowLeft,
  Brain,
  Loader2,
  Wifi,
  WifiOff,
  Zap,
  MessageSquare,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { CredentialsTab } from '@/features/bots/credentials-tab';
import { TemplateTab } from '@/features/bots/template-tab';
import { ProductsTab } from '@/features/bots/products-tab';
import { FollowupsTab } from '@/features/bots/followups-tab';
import { WhatsAppTab } from '@/features/bots/whatsapp-tab';
import type { Bot as BotType } from '@/types';

export default function BotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [bot, setBot] = useState<BotType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBot() {
      try {
        const res = await fetch(`/api/bots/${id}`);
        if (res.ok) {
          setBot(await res.json());
        }
      } catch (err) {
        console.error('Error loading bot:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBot();
  }, [id]);

  const hasApiKey = !!bot?.openai_api_key && bot.openai_api_key !== 'your_openai_api_key';
  const waSession = bot?.whatsapp_sessions;
  const waConnected = waSession && (
    Array.isArray(waSession) ? waSession[0]?.status === 'connected' : waSession.status === 'connected'
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(79, 124, 255, 0.15)', borderTopColor: '#4F7CFF' }} />
            <Brain className="absolute inset-0 m-auto h-5 w-5 text-[#4F7CFF]" />
          </div>
          <p className="text-sm text-[#94A3B8]">Cargando agente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* ── HERO HEADER ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 md:p-6 animate-fade-in-up"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))',
          border: '1px solid rgba(79, 124, 255, 0.08)',
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(79, 124, 255, 0.3), transparent)' }} />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.25), transparent)' }} />

        <div className="relative">
          {/* Back + Name */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 md:gap-4">
              <Link
                href="/bots"
                className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/5"
                style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <ArrowLeft className="h-4 w-4 text-[#94A3B8]" />
              </Link>
              <div
                className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl shrink-0"
                style={{
                  background: bot?.is_active
                    ? 'linear-gradient(135deg, #4F7CFF, #56CCF2)'
                    : 'rgba(148, 163, 184, 0.1)',
                  boxShadow: bot?.is_active ? '0 4px 16px rgba(79, 124, 255, 0.3)' : 'none',
                }}
              >
                <Brain className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-xl font-bold text-white flex items-center gap-2 md:gap-2.5 flex-wrap">
                  <span className="truncate">{bot?.name || 'Agente'}</span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold leading-none"
                    style={{
                      background: bot?.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.08)',
                      color: bot?.is_active ? '#10B981' : '#94A3B8',
                      border: `1px solid ${bot?.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.1)'}`,
                    }}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${bot?.is_active ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'}`} />
                    {bot?.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </h1>
                <p className="text-sm text-[#94A3B8] mt-0.5">Centro de control del agente</p>
              </div>
            </div>
          </div>

          {/* Quick status chips */}
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-[11px] font-medium"
              style={{
                background: waConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.025)',
                color: waConnected ? '#10B981' : '#94A3B8',
                border: `1px solid ${waConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)'}`,
              }}
            >
              {waConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3 opacity-40" />}
              {waConnected ? 'WhatsApp Conectado' : 'Sin conexion'}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-[11px] font-medium"
              style={{
                background: hasApiKey ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.025)',
                color: hasApiKey ? '#F59E0B' : '#94A3B8',
                border: `1px solid ${hasApiKey ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)'}`,
              }}
            >
              <Zap className="h-3 w-3" />
              {hasApiKey ? 'API Key configurada' : 'Sin API Key'}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-[11px] font-medium"
              style={{
                background: bot?.gpt_model ? 'rgba(79, 124, 255, 0.08)' : 'rgba(255, 255, 255, 0.025)',
                color: bot?.gpt_model ? '#4F7CFF' : '#94A3B8',
                border: `1px solid ${bot?.gpt_model ? 'rgba(79, 124, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)'}`,
              }}
            >
              <Brain className="h-3 w-3" />
              {bot?.gpt_model || 'Sin modelo'}
            </span>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <MobileTabs botId={id} />
      <DesktopTabs botId={id} />
    </div>
  );
}

/* ── Desktop Tabs (hidden on mobile) ── */
function DesktopTabs({ botId }: { botId: string }) {
  return (
    <div className="hidden md:block animate-fade-in-up-delay-1">
      <Tabs defaultValue="credentials">
        <TabsList
          className="bg-transparent p-1 h-auto w-full justify-start gap-1 rounded-xl"
          style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
        >
          {[
            { value: 'credentials', label: 'Credenciales', icon: Key },
            { value: 'template', label: 'Plantilla', icon: FileText },
            { value: 'products', label: 'Productos', icon: Package },
            { value: 'followups', label: 'Seguimientos', icon: Clock },
            { value: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg px-4 py-2.5 gap-2 text-[13px] font-medium text-[#94A3B8] transition-all duration-200 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent hover:text-white whitespace-nowrap"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-6">
          <TabsContent value="credentials"><CredentialsTab botId={botId} /></TabsContent>
          <TabsContent value="template"><TemplateTab botId={botId} /></TabsContent>
          <TabsContent value="products"><ProductsTab botId={botId} /></TabsContent>
          <TabsContent value="followups"><FollowupsTab botId={botId} /></TabsContent>
          <TabsContent value="whatsapp"><WhatsAppTab botId={botId} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* ── Mobile Section Selector (visible only on mobile) ── */
const SECTIONS = [
  { value: 'credentials', label: 'Credenciales', desc: 'API Keys y modelo de IA', icon: Key, color: '#F59E0B' },
  { value: 'template', label: 'Plantilla', desc: 'System prompt del bot', icon: FileText, color: '#56CCF2' },
  { value: 'products', label: 'Productos', desc: 'Productos que vende el bot', icon: Package, color: '#A78BFA' },
  { value: 'followups', label: 'Seguimientos', desc: 'Intervalos de seguimiento', icon: Clock, color: '#10B981' },
  { value: 'whatsapp', label: 'WhatsApp', desc: 'Conexion y estado', icon: Smartphone, color: '#4F7CFF' },
] as const;

type SectionValue = typeof SECTIONS[number]['value'];

const SECTION_COMPONENTS: Record<SectionValue, React.ComponentType<{ botId: string }>> = {
  credentials: CredentialsTab,
  template: TemplateTab,
  products: ProductsTab,
  followups: FollowupsTab,
  whatsapp: WhatsAppTab,
};

function MobileTabs({ botId }: { botId: string }) {
  const [activeSection, setActiveSection] = useState<SectionValue>('credentials');
  const [menuOpen, setMenuOpen] = useState(false);

  const current = SECTIONS.find((s) => s.value === activeSection)!;
  const Component = SECTION_COMPONENTS[activeSection];

  return (
    <div className="md:hidden animate-fade-in-up-delay-1 space-y-4">
      {/* Section selector */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Current section button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center gap-3 p-3 transition-all"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ background: `${current.color}18`, border: `1px solid ${current.color}25` }}
          >
            <current.icon className="h-4 w-4" style={{ color: current.color }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-semibold text-white">{current.label}</p>
            <p className="text-[10px] text-[#94A3B8]/50">{current.desc}</p>
          </div>
          <span className="text-[10px] text-[#94A3B8]/40 font-medium shrink-0">Cambiar</span>
          <ChevronRight className={`h-3.5 w-3.5 text-[#94A3B8]/30 shrink-0 transition-transform duration-200 ${menuOpen ? 'rotate-90' : ''}`} />
        </button>

        {/* Expanded menu */}
        {menuOpen && (
          <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
            {SECTIONS.filter((s) => s.value !== activeSection).map((section) => (
              <button
                key={section.value}
                onClick={() => { setActiveSection(section.value); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 rounded-xl p-2.5 transition-all active:scale-[0.98]"
                style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                  style={{ background: `${section.color}15`, border: `1px solid ${section.color}20` }}
                >
                  <section.icon className="h-4 w-4" style={{ color: section.color }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-medium text-white">{section.label}</p>
                  <p className="text-[10px] text-[#94A3B8]/50">{section.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]/25 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section content */}
      {!menuOpen && <Component botId={botId} />}
    </div>
  );
}
