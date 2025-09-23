import React from 'react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const LoadingButton = ({ isLoading, children, disabled, ...props }) => {
  return (
    <Button disabled={isLoading || disabled} {...props}>
      {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </Button>
  );
};

export default LoadingButton;