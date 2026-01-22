import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

const Card = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      ref={ref}
      className={cn(
        // Base styling
        'rounded-xl text-card-foreground transition-all duration-300',
        // Light mode: Paper & Ink with soft ambient shadows
        isLight && [
          'bg-white border border-slate-200/60',
          'shadow-[0_1px_3px_rgb(0_0_0/0.04),0_4px_12px_rgb(0_0_0/0.04)]',
          'hover:shadow-[0_4px_12px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.06)]',
          'hover:border-slate-200/80',
        ],
        // Dark mode: Stealth styling with luminous borders
        !isLight && [
          'bg-surface-secondary',
          'border border-white/[0.08] shadow-luminous',
          'hover:shadow-glow-sm hover:border-white/[0.12]',
        ],
        // Variant styles
        variant === 'elevated' && (isLight
          ? 'shadow-[0_8px_24px_rgb(0_0_0/0.08),0_16px_48px_rgb(0_0_0/0.08)] border-slate-200/40'
          : 'bg-charcoal-700 shadow-elevation-2'
        ),
        variant === 'accent' && (isLight
          ? 'border-emerald-500/20 shadow-[0_0_0_1px_hsl(155_80%_32%/0.1),0_2px_8px_hsl(155_80%_32%/0.08)]'
          : 'border-electric-500/30 shadow-luminous-accent'
        ),
        variant === 'hero' && (isLight
          ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200/50 shadow-[0_8px_32px_rgb(0_0_0/0.06)]'
          : 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30'
        ),
        className
      )}
      {...props}
    />
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-heading-md leading-none tracking-tight text-content-primary', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-body-sm text-content-secondary', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };