import React from 'react';
import { Input } from '@/components/ui/input';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import { cn } from '@/lib/utils';

/**
 * Safe mobile-optimized input component
 * Adds mobile-specific optimizations without breaking existing inputs
 */
const MobileOptimizedInput = ({ className, style, ...props }) => {
  const { keyboardHeight, isKeyboardOpen } = useMobileOptimizations();

  return (
    <div 
      className={cn("transition-all duration-200", className)}
      style={{
        paddingBottom: isKeyboardOpen ? '20px' : '0',
        ...style
      }}
    >
      <Input 
        {...props}
        className={cn(
          "text-base", // Prevent zoom on iOS
          props.className
        )}
      />
    </div>
  );
};

export default MobileOptimizedInput;
