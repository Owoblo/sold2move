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
        'rounded-2xl text-card-foreground transition-all duration-300',
        // Light mode: Luxury Gallery - floating cards with NO borders, large soft shadows
        isLight && [
          'bg-white',
          'border-none', // Remove borders - shadows do the work
          'shadow-[0_2px_4px_rgb(0_0_0/0.02),0_8px_24px_rgb(0_0_0/0.04),0_16px_48px_rgb(0_0_0/0.02)]',
          'hover:shadow-[0_4px_8px_rgb(0_0_0/0.03),0_12px_32px_rgb(0_0_0/0.06),0_24px_64px_rgb(0_0_0/0.03)]',
          'hover:-translate-y-0.5',
        ],
        // Dark mode: Stealth styling with luminous borders
        !isLight && [
          'bg-surface-secondary',
          'border border-white/[0.08] shadow-luminous',
          'hover:shadow-glow-sm hover:border-white/[0.12]',
        ],
        // Variant styles
        variant === 'elevated' && (isLight
          ? 'shadow-[0_8px_16px_rgb(0_0_0/0.04),0_20px_48px_rgb(0_0_0/0.08),0_40px_80px_rgb(0_0_0/0.04)]'
          : 'bg-charcoal-700 shadow-elevation-2'
        ),
        variant === 'accent' && (isLight
          ? 'shadow-[0_2px_8px_hsl(158_64%_35%/0.12)]'
          : 'border-electric-500/30 shadow-luminous-accent'
        ),
        variant === 'hero' && (isLight
          ? 'bg-gradient-to-br from-emerald-50 to-white shadow-[0_8px_32px_rgb(0_0_0/0.06)]'
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