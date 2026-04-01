'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between animate-fade-in-up', className)}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[#94A3B8]">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
