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
  Wifi,
  WifiOff,
  Zap,
  ChevronRight,
  Shield,
  Settings2,
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
        if (res.ok) setBot(await res.json());
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#8B5CF6]/20 to-[#EC4899]/20 blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(139, 92, 246, 0.1)', borderTopColor: '#8B5CF6' }} />
            <Brain className="absolute inset-0 m-auto h-6 w-6 text-[#8B5CF6]" />
          </div>
          <p className="text-sm text-muted-foreground/60">Cargando agente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">

      {/* ═══ HERO HEADER ═══ */}
      <div className="relative overflow-hidden rounded-2xl animate-fade-in-up">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/15 via-[#EC4899]/8 to-[#06B6D4]/10" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(12,11,24,0.88), rgba(18,17,28,0.92))' }} />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] opacity-25 pointer-events-none bg-[#8B5CF6]" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 rounded-full blur-[80px] opacity-15 pointer-events-none bg-[#EC4899]" />

        <div className="relative p-5 md:p-7">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <Link
              href="/bots"
              className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground/50 hover:text-white transition-colors group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/[0.06] group-hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline">Mis Agentes</span>
            </Link>
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground/30" />
              <span className="text-[10px] text-muted-foreground/30 uppercase tracking-wider font-semibold">Configuracion</span>
            </div>
          </div>

          {/* Bot identity */}
          <div className="flex items-start gap-4 md:gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] opacity-40 blur-md" />
              <div
                className="relative flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl shadow-xl"
                style={{
                  background: bot?.is_active
                    ? 'linear-gradient(135deg, #8B5CF6, #EC4899)'
                    : 'linear-gradient(135deg, rgba(145,137,168,0.2), rgba(145,137,168,0.1))',
                }}
              >
                <Brain className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              {/* Online indicator */}
              {bot?.is_active && (
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#12111C] flex items-center justify-center">
                  <div className="relative">
                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-[#10B981] opacity-50 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                  {bot?.name || 'Agente'}
                </h1>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-bold leading-none uppercase tracking-wider"
                  style={{
                    background: bot?.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(145, 137, 168, 0.08)',
                    color: bot?.is_active ? '#10B981' : '#9189A8',
                    border: `1px solid ${bot?.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(145, 137, 168, 0.1)'}`,
                  }}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${bot?.is_active ? 'bg-[#10B981]' : 'bg-[#9189A8]'}`} />
                  {bot?.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground/50 mt-1">{bot?.description || 'Agente de ventas con IA'}</p>

              {/* Status chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                <StatusChip
                  icon={waConnected ? Wifi : WifiOff}
                  label={waConnected ? 'WhatsApp' : 'Desconectado'}
                  active={!!waConnected}
                  color="#10B981"
                />
                <StatusChip
                  icon={Zap}
                  label={hasApiKey ? 'API Key' : 'Sin API Key'}
                  active={hasApiKey}
                  color="#F59E0B"
                />
                <StatusChip
                  icon={Brain}
                  label={bot?.gpt_model || 'Sin modelo'}
                  active={!!bot?.gpt_model}
                  color="#8B5CF6"
                />
                <StatusChip
                  icon={Shield}
                  label={bot?.is_active ? '24/7' : 'Off'}
                  active={!!bot?.is_active}
                  color="#EC4899"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <DesktopTabs botId={id} />
      <MobileTabs botId={id} />
    </div>
  );
}

/* ── Status Chip ── */
function StatusChip({ icon: Icon, label, active, color }: { icon: React.ElementType; label: string; active: boolean; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-[10px] font-semibold transition-all"
      style={{
        background: active ? `${color}10` : 'rgba(255, 255, 255, 0.02)',
        color: active ? color : '#9189A8',
        border: `1px solid ${active ? `${color}20` : 'rgba(255, 255, 255, 0.04)'}`,
      }}
    >
      <Icon className="h-3 w-3" style={{ opacity: active ? 1 : 0.4 }} />
      {label}
    </span>
  );
}

/* ── Desktop Tabs ── */
function DesktopTabs({ botId }: { botId: string }) {
  const tabs = [
    { value: 'credentials', label: 'Credenciales', icon: Key, color: '#F59E0B' },
    { value: 'template', label: 'Plantilla', icon: FileText, color: '#06B6D4' },
    { value: 'products', label: 'Productos', icon: Package, color: '#EC4899' },
    { value: 'followups', label: 'Seguimientos', icon: Clock, color: '#10B981' },
    { value: 'whatsapp', label: 'WhatsApp', icon: Smartphone, color: '#8B5CF6' },
  ];

  return (
    <div className="hidden md:block animate-fade-in-up-delay-1">
      <Tabs defaultValue="credentials">
        <TabsList className="bg-transparent p-1.5 h-auto w-full justify-start gap-1.5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-xl px-5 py-3 gap-2.5 text-[13px] font-semibold text-muted-foreground/60 transition-all duration-200 data-[state=active]:text-white data-[state=active]:bg-white/[0.04] data-[state=active]:shadow-none bg-transparent hover:text-white hover:bg-white/[0.02] whitespace-nowrap"
            >
              <tab.icon className="h-4 w-4" />
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

/* ── Mobile Section Selector ── */
const SECTIONS = [
  { value: 'credentials', label: 'Credenciales', desc: 'API Keys y modelo de IA', icon: Key, color: '#F59E0B' },
  { value: 'template', label: 'Plantilla', desc: 'System prompt del bot', icon: FileText, color: '#06B6D4' },
  { value: 'products', label: 'Productos', desc: 'Catalogo de ventas', icon: Package, color: '#EC4899' },
  { value: 'followups', label: 'Seguimientos', desc: 'Mensajes automaticos', icon: Clock, color: '#10B981' },
  { value: 'whatsapp', label: 'WhatsApp', desc: 'Conexion y estado', icon: Smartphone, color: '#8B5CF6' },
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
      <div className="rounded-xl overflow-hidden border border-white/[0.04] bg-white/[0.01]">
        {/* Current section */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center gap-3 p-3.5 transition-all"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{ background: `${current.color}12`, border: `1px solid ${current.color}20` }}
          >
            <current.icon className="h-4.5 w-4.5" style={{ color: current.color }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-semibold text-white">{current.label}</p>
            <p className="text-[10px] text-muted-foreground/40">{current.desc}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground/30 font-medium">Cambiar</span>
            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/25 transition-transform duration-200 ${menuOpen ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {/* Expanded menu */}
        {menuOpen && (
          <div className="px-3 pb-3 space-y-1.5 border-t border-white/[0.04] pt-2.5">
            {SECTIONS.filter((s) => s.value !== activeSection).map((section) => (
              <button
                key={section.value}
                onClick={() => { setActiveSection(section.value); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 rounded-xl p-3 transition-all active:scale-[0.98] hover:bg-white/[0.02] border border-white/[0.03]"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                  style={{ background: `${section.color}10`, border: `1px solid ${section.color}18` }}
                >
                  <section.icon className="h-4 w-4" style={{ color: section.color }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-medium text-white">{section.label}</p>
                  <p className="text-[10px] text-muted-foreground/40">{section.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0" />
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
