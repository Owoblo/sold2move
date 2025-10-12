import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle({ className = '', size = 'sm' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={toggleTheme}
      className={`hover:bg-teal/10 hover:text-teal transition-colors ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

export default ThemeToggle;
