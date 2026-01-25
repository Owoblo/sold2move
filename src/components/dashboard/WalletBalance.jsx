import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Plus, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Compact wallet balance display for sidebar/header
 */
export function WalletBalance({ variant = 'sidebar', showAddButton = true }) {
  const { formattedBalance, balance, loading } = useWallet();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/dashboard/wallet"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Wallet className="h-4 w-4 text-primary" />
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <span className="font-semibold text-primary">{formattedBalance}</span>
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Wallet Balance - Click to add funds</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/dashboard/wallet"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
        >
          <Wallet className="h-4 w-4 text-muted-foreground" />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-sm font-medium">{formattedBalance}</span>
          )}
        </Link>
        {showAddButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/dashboard/wallet">
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Funds</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // Default sidebar variant
  return (
    <div
      className="p-3 mx-3 mb-2 rounded-lg border"
      style={{
        background: isLight
          ? 'linear-gradient(to right, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.03))'
          : 'linear-gradient(to right, rgba(0, 255, 136, 0.1), rgba(0, 255, 136, 0.05))',
        borderColor: isLight ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 255, 136, 0.2)'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet className={`h-4 w-4 ${isLight ? 'text-emerald-600' : 'text-primary'}`} />
          <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-muted-foreground'}`}>Wallet Balance</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {loading ? (
          <Loader2 className={`h-5 w-5 animate-spin ${isLight ? 'text-emerald-600' : 'text-primary'}`} />
        ) : (
          <span className={`text-lg font-bold ${isLight ? 'text-emerald-600' : 'text-primary'}`}>{formattedBalance}</span>
        )}
        <Link to="/dashboard/wallet">
          <Button
            size="sm"
            variant="outline"
            className={`h-7 text-xs ${
              isLight
                ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                : 'border-primary/30 hover:bg-primary/10'
            }`}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </Link>
      </div>
      {!loading && balance > 0 && (
        <p className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-muted-foreground'}`}>
          ~{Math.floor(balance / 2)} mail pieces available
        </p>
      )}
    </div>
  );
}

export default WalletBalance;
