import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send
} from 'lucide-react';
import { useWallet } from '../../../hooks/useWallet';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { useToast } from '../../ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';

const FUNDING_PRESETS = [
  { id: 'small', amount: 250, label: '$250', letters: '~125 letters' },
  { id: 'medium', amount: 500, label: '$500', letters: '~250 letters', popular: true },
  { id: 'large', amount: 1000, label: '$1,000', letters: '~500 letters' },
  { id: 'xlarge', amount: 2500, label: '$2,500', letters: '~1,250 letters' },
];

const COST_PER_LETTER = 2.00; // Average cost per mail piece

export default function WalletPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    wallet,
    balance,
    formattedBalance,
    transactions,
    loading,
    addFunds,
    fetchTransactions,
    refetch
  } = useWallet();

  const [selectedPreset, setSelectedPreset] = useState('medium');
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle payment success/cancel from URL params
  useEffect(() => {
    const payment = searchParams.get('payment');
    const amount = searchParams.get('amount');

    if (payment === 'success') {
      toast({
        title: 'Payment Successful!',
        description: `$${amount || ''} has been added to your wallet.`,
        variant: 'default',
      });
      refetch();
      fetchTransactions();
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/wallet');
    } else if (payment === 'cancelled') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your wallet funding was cancelled.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/dashboard/wallet');
    }
  }, [searchParams, toast, refetch, fetchTransactions]);

  // Fetch transactions on mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAddFunds = async () => {
    try {
      setIsProcessing(true);

      let amount;
      if (selectedPreset === 'custom') {
        amount = parseFloat(customAmount);
        if (isNaN(amount) || amount < 50 || amount > 10000) {
          toast({
            title: 'Invalid Amount',
            description: 'Please enter an amount between $50 and $10,000',
            variant: 'destructive',
          });
          return;
        }
      }

      await addFunds(amount, selectedPreset !== 'custom' ? selectedPreset : null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getEstimatedLetters = (amount) => {
    return Math.floor(amount / COST_PER_LETTER);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'campaign_charge':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'refund':
        return <ArrowUpRight className="h-4 w-4 text-yellow-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionBadge = (type) => {
    switch (type) {
      case 'deposit':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Deposit</Badge>;
      case 'campaign_charge':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Campaign</Badge>;
      case 'refund':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Refund</Badge>;
      case 'bonus':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Bonus</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Wallet</h1>
        <p style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
          Fund your account to launch direct mail campaigns
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Balance Card */}
        <div
          className="md:col-span-1 rounded-2xl overflow-hidden"
          style={{
            background: isLight
              ? 'linear-gradient(to bottom right, rgba(5, 150, 105, 0.1), rgba(5, 150, 105, 0.05), transparent)'
              : 'linear-gradient(to bottom right, rgba(0, 255, 136, 0.1), rgba(0, 255, 136, 0.05), transparent)',
            border: isLight ? '1px solid rgba(5, 150, 105, 0.2)' : '1px solid rgba(0, 255, 136, 0.2)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="p-6 pb-2">
            <p className="text-sm" style={{ color: isLight ? 'rgba(5, 150, 105, 0.7)' : 'rgba(0, 255, 136, 0.7)' }}>Available Balance</p>
          </div>
          <div className="p-6 pt-0">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full" style={{ backgroundColor: isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(0, 255, 136, 0.1)' }}>
                <Wallet className="h-6 w-6" style={{ color: isLight ? '#059669' : '#00FF88' }} />
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: isLight ? '#059669' : '#00FF88' }}>{formattedBalance}</p>
                <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                  ~{getEstimatedLetters(balance)} letters
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          className="md:col-span-2 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="p-6 pb-2">
            <h3 className="text-lg font-semibold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Campaign Power</h3>
            <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>What you can do with your balance</p>
          </div>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{getEstimatedLetters(balance)}</p>
                <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Postcards</p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{Math.floor(balance / 2.50)}</p>
                <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Letters</p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{Math.floor(balance / 3.50)}</p>
                <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Handwritten</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Funds */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
              <Plus className="h-5 w-5" />
              Add Funds
            </h3>
            <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
              Choose an amount to add to your wallet
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* Preset Amounts */}
            <div className="grid grid-cols-2 gap-3">
              {FUNDING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setCustomAmount('');
                  }}
                  className={`
                    relative p-4 rounded-lg border-2 text-left transition-all
                    ${selectedPreset === preset.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  {preset.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs">
                      Popular
                    </Badge>
                  )}
                  <p className="text-lg font-semibold">{preset.label}</p>
                  <p className="text-sm text-muted-foreground">{preset.letters}</p>
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Label htmlFor="customAmount">Or enter custom amount</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="customAmount"
                    type="number"
                    min="50"
                    max="10000"
                    placeholder="500"
                    className="pl-7"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedPreset('custom');
                    }}
                    onFocus={() => setSelectedPreset('custom')}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Min: $50 | Max: $10,000</p>
            </div>

            <Separator />

            {/* Summary */}
            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount to add</span>
                <span className="font-medium">
                  ${selectedPreset === 'custom'
                    ? (parseFloat(customAmount) || 0).toFixed(2)
                    : FUNDING_PRESETS.find(p => p.id === selectedPreset)?.amount.toFixed(2) || '0.00'
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. mail pieces</span>
                <span className="font-medium">
                  ~{getEstimatedLetters(
                    selectedPreset === 'custom'
                      ? parseFloat(customAmount) || 0
                      : FUNDING_PRESETS.find(p => p.id === selectedPreset)?.amount || 0
                  )} pieces
                </span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleAddFunds}
              disabled={isProcessing || (selectedPreset === 'custom' && (!customAmount || parseFloat(customAmount) < 50))}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Add Funds
                </>
              )}
            </Button>

            <p className="text-xs text-center" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
              Secure payment powered by Stripe
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
              <Clock className="h-5 w-5" />
              Transaction History
            </h3>
            <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
              Recent wallet activity
            </p>
          </div>
          <div className="p-6">
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 mx-auto mb-3" style={{ color: isLight ? '#94a3b8' : 'rgba(148,163,184,0.5)' }} />
                <p style={{ color: isLight ? '#64748b' : '#94a3b8' }}>No transactions yet</p>
                <p className="text-sm" style={{ color: isLight ? '#94a3b8' : 'rgba(148,163,184,0.7)' }}>
                  Add funds to get started with campaigns
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors"
                    style={{
                      backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full" style={{ backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)' }}>
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{tx.description || tx.type}</p>
                        <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                          {new Date(tx.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'bonus'
                          ? 'text-green-500'
                          : ''
                      }`} style={{
                        color: tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'bonus'
                          ? undefined
                          : isLight ? '#0f172a' : '#e2e8f0'
                      }}>
                        {tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'bonus' ? '+' : '-'}
                        ${Math.abs(tx.amount).toFixed(2)}
                      </p>
                      {getTransactionBadge(tx.type)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>No Expiration</p>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                Funds never expire. Use them whenever you're ready.
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start gap-3">
            <Send className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Campaign Ready</p>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                Launch campaigns instantly with your wallet balance.
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Transparent Pricing</p>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                ~$1.50-3.50 per piece depending on type.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
