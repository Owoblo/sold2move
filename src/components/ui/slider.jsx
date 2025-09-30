import React from 'react';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
  >
    <input
      type="range"
      className="w-full h-2 bg-lightest-navy/20 rounded-lg appearance-none cursor-pointer slider"
      {...props}
    />
    <style jsx>{`
      .slider::-webkit-slider-thumb {
        appearance: none;
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: var(--green);
        cursor: pointer;
        border: 2px solid var(--deep-navy);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .slider::-webkit-slider-thumb:hover {
        background: var(--green-hover);
        transform: scale(1.1);
      }
      
      .slider::-moz-range-thumb {
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: var(--green);
        cursor: pointer;
        border: 2px solid var(--deep-navy);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .slider::-moz-range-thumb:hover {
        background: var(--green-hover);
        transform: scale(1.1);
      }
    `}</style>
  </div>
));
Slider.displayName = 'Slider';

export { Slider };
