import React from 'react';
import { cn } from '@/lib/utils';

const SkeletonLoader = ({ className, count = 1, type = 'line' }) => {
  const skeletons = Array.from({ length: count });

  const baseClass = 'bg-lightest-navy/10 animate-pulse rounded-md';

  const typeClasses = {
    line: 'h-4',
    card: 'h-48',
    avatar: 'h-12 w-12 rounded-full',
    title: 'h-8 w-3/4 mb-2',
    text: 'h-4 w-full mb-2',
  };

  return (
    <>
      {skeletons.map((_, index) => (
        <div key={index} className={cn(baseClass, typeClasses[type], className)} />
      ))}
    </>
  );
};

export default SkeletonLoader;