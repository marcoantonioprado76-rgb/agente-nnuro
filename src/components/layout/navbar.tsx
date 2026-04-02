'use client';

import { Search } from 'lucide-react';
import { NotificationBell } from '@/components/layout/notification-panel';
import { SearchDialog, SearchTrigger } from '@/components/layout/search-dialog';

interface NavbarProps {
  title: string;
  description?: string;
}

export function Navbar({ title, description }: NavbarProps) {
  return (
    <>
      {/* Desktop navbar - hidden on mobile (mobile-header handles it) */}
      <header className="sticky top-0 z-30 hidden lg:flex h-16 items-center justify-between px-6 navbar-glass">
        <div>
          <h1 className="text-[17px] font-semibold text-white tracking-tight">{title}</h1>
          {description && (
            <p className="text-[11px] text-[#64748B]/60 font-medium">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <SearchTrigger />
          <NotificationBell />
        </div>
      </header>

      {/* Mobile page title */}
      <div className="lg:hidden px-4 pt-4 pb-2">
        <h1 className="text-[18px] font-bold text-white tracking-tight">{title}</h1>
        {description && (
          <p className="text-[11px] text-[#64748B]/50 font-medium mt-0.5">{description}</p>
        )}
      </div>

      <SearchDialog />
    </>
  );
}
