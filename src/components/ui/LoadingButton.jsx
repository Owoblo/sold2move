import React from 'react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const LoadingButton = ({ isLoading, children, disabled, asChild, ...props }) => {
  // If asChild is used, we can't add loading spinner as it would create multiple children
  // The loading state should be handled by the parent component
  if (asChild) {
    return (
      <Button disabled={isLoading || disabled} asChild {...props}>
        {children}
      </Button>
    );
  }

  return (
    <Button disabled={isLoading || disabled} {...props}>
      {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </Button>
  );
};

export default LoadingButton;