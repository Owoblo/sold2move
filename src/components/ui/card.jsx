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
        // Light mode: Clean white cards with subtle border and shadow
        isLight && [
          'bg-white',
          'border border-gray-200',
          'shadow-sm',
          'hover:shadow-md',
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
          ? 'shadow-md hover:shadow-lg'
          : 'bg-charcoal-700 shadow-elevation-2'
        ),
        variant === 'accent' && (isLight
          ? 'border-emerald-200 shadow-sm'
          : 'border-electric-500/30 shadow-luminous-accent'
        ),
        variant === 'hero' && (isLight
          ? 'bg-gradient-to-br from-emerald-50 to-white shadow-md'
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