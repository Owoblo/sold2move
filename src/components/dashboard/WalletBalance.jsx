import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Plus, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

/**
 * Compact wallet balance display for sidebar/header
 */
export function WalletBalance({ variant = 'sidebar', showAddButton = true }) {
  const { formattedBalance, balance, loading } = useWallet();

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
    <div className="p-3 mx-3 mb-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Wallet Balance</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <span className="text-lg font-bold text-primary">{formattedBalance}</span>
        )}
        <Link to="/dashboard/wallet">
          <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 hover:bg-primary/10">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </Link>
      </div>
      {!loading && balance > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          ~{Math.floor(balance / 2)} mail pieces available
        </p>
      )}
    </div>
  );
}

export default WalletBalance;
