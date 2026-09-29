import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatCardTheme = 'blue' | 'purple' | 'orange' | 'green' | 'teal' | 'pink' | 'red';

// Map legacy 'tone' to 'colorTheme'
type Tone = 'default' | 'success' | 'destructive' | 'primary';
const toneToTheme: Record<Tone, StatCardTheme> = {
  default: 'blue',
  success: 'green',
  destructive: 'red',
  primary: 'blue',
};

const themeStyles: Record<StatCardTheme, { bg: string; footerBg: string; text: string; iconBg: string }> = {
  blue: { bg: 'bg-[#3b82f6]', footerBg: 'bg-[#2563eb]', text: 'text-white', iconBg: 'bg-white/20' },
  purple: { bg: 'bg-[#8b5cf6]', footerBg: 'bg-[#7c3aed]', text: 'text-white', iconBg: 'bg-white/20' },
  orange: { bg: 'bg-[#f59e0b]', footerBg: 'bg-[#d97706]', text: 'text-white', iconBg: 'bg-white/20' },
  green: { bg: 'bg-[#10b981]', footerBg: 'bg-[#059669]', text: 'text-white', iconBg: 'bg-white/20' },
  teal: { bg: 'bg-[#06b6d4]', footerBg: 'bg-[#0891b2]', text: 'text-white', iconBg: 'bg-white/20' },
  pink: { bg: 'bg-[#ec4899]', footerBg: 'bg-[#db2777]', text: 'text-white', iconBg: 'bg-white/20' },
  red: { bg: 'bg-[#ef4444]', footerBg: 'bg-[#dc2626]', text: 'text-white', iconBg: 'bg-white/20' },
};

export function StatCard({
  label,
  value,
  tone = 'default',
  colorTheme,
  icon: Icon,
  onClick,
  className,
  footerText = 'View Details'
}: {
  label: string;
  value: string;
  tone?: Tone;
  colorTheme?: StatCardTheme;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
  footerText?: string;
}) {
  const theme = colorTheme || toneToTheme[tone];
  const styles = themeStyles[theme];

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden flex flex-col shadow-sm transition-transform hover:-translate-y-1',
        styles.bg,
        styles.text,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="p-5 flex-1 relative">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-3">
              {label}
            </h3>
            <div className="text-4xl font-bold tracking-tight">
              {value}
            </div>
          </div>
          {Icon && (
            <div className={cn('p-2.5 rounded-full', styles.iconBg)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </div>
      {onClick && (
        <div className={cn('px-5 py-3 flex items-center justify-between text-sm font-medium opacity-95', styles.footerBg)}>
          <span>{footerText}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
