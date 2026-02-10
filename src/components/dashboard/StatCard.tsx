import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon: Icon,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  const iconBgStyles = {
    default: 'bg-muted',
    primary: 'bg-primary/20',
    success: 'bg-success/20',
    warning: 'bg-warning/20',
    destructive: 'bg-destructive/20',
  };

  return (
    <div className={cn("stat-card border border-border/50", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", iconBgStyles[variant])}>
          <Icon className={cn("w-5 h-5", variantStyles[variant])} />
        </div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            change >= 0 
              ? "bg-success/20 text-success" 
              : "bg-destructive/20 text-destructive"
          )}>
            <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className={cn("metric-value", variantStyles[variant])}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
      {changeLabel && change !== undefined && (
        <p className="text-xs text-muted-foreground mt-2">{changeLabel}</p>
      )}
    </div>
  );
};

export default StatCard;
