'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SubscriptionGuard } from '@/components/subscription-guard';
import { AIAssistantBubble } from '@/components/ai-assistant-bubble';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAdmin) {
      window.location.href = '/admin/dashboard';
    }
  }, [isAdmin, loading]);

  if (loading || isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen" style={{
      background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.12), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(124, 58, 237, 0.06), transparent), linear-gradient(180deg, #0C0B18 0%, #110F22 50%, #0D0C16 100%)',
    }}>
      <Sidebar />
      <MobileHeader variant="user" />
      <main className="flex-1 lg:ml-[260px] transition-all duration-300 pb-20 lg:pb-0 min-w-0">
        <SubscriptionGuard>
          {children}
        </SubscriptionGuard>
      </main>
      <MobileNav />
      <AIAssistantBubble />
    </div>
  );
}
