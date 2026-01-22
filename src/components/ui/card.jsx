import React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Stealth card styling with luminous borders
      'rounded-lg bg-surface-secondary text-card-foreground transition-all duration-normal',
      // Luminous border effect
      'border border-white/[0.08] shadow-luminous',
      // Hover glow effect
      'hover:shadow-glow-sm hover:border-white/[0.12]',
      // Variant styles
      variant === 'elevated' && 'bg-charcoal-700 shadow-elevation-2',
      variant === 'accent' && 'border-electric-500/30 shadow-luminous-accent',
      className
    )}
    {...props}
  />
));
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