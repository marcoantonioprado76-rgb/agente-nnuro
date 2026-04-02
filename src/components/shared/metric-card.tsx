'use client';

import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl p-5 transition-all duration-220 glass-panel-hover',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.8), rgba(22, 32, 51, 0.6))',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.12em]">
            {title}
          </p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                trendUp ? 'text-[#10B981]' : 'text-red-400'
              )}
            >
              {trend}
            </p>
          )}
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl metric-icon-glow"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.08))',
            border: '1px solid rgba(139, 92, 246, 0.12)',
          }}
        >
          <Icon className="h-5 w-5 text-[#8B5CF6]" />
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-40"
        style={{ background: 'linear-gradient(90deg, transparent, #8B5CF6, transparent)' }}
      />
    </div>
  );
}
