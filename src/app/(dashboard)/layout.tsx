'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SubscriptionGuard } from '@/components/subscription-guard';
import { TechBackground } from '@/components/layout/tech-background';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col lg:flex-row min-h-screen">
      <TechBackground />
      <Sidebar />
      <MobileHeader variant="user" />
      <main className="flex-1 lg:ml-[260px] transition-all duration-300 pb-20 lg:pb-0 min-w-0">
        <SubscriptionGuard>
          {children}
        </SubscriptionGuard>
      </main>
      <MobileNav />
    </div>
  );
}
