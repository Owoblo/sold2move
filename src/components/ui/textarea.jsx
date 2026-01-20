import React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Standardized textarea styling matching input component
        'flex min-h-20 w-full rounded-md border border-lightest-navy/20 bg-surface-secondary px-3 py-2',
        'text-body-sm text-content-primary',
        'ring-offset-background transition-all duration-normal resize-none',
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
Textarea.displayName = 'Textarea';

export { Textarea };