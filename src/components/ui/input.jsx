import React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // Standardized input styling with design system tokens
        'flex h-10 w-full rounded-md border border-lightest-navy/20 bg-surface-secondary px-3 py-2',
        'text-body-sm text-content-primary',
        'ring-offset-background transition-all duration-normal',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-content-secondary/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-brand-primary/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hover:border-lightest-navy/30',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };