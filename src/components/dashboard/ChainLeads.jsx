import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Link2,
  Home,
  ArrowRight,
  MapPin,
  Calendar,
  DollarSign,
  User,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useChainLeads } from '@/hooks/useChainLeads';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Chain Leads Dashboard - Shows buyer-seller chain detection results
 * These are guaranteed move leads: someone bought a new home but still owns another
 */
const ChainLeads = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [statusFilter, setStatusFilter] = useState('detected');

  const {
    chains,
    count,
    loading,
    error,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    revealChain,
    runBatchDetection,
    isRevealed,
    refresh,
    getConfidenceLabel,
    getConfidenceColor,
    formatMatchSignals,
    getDaysSinceDetection
  } = useChainLeads({ status: statusFilter });

  const [revealing, setRevealing] = useState(null);
  const [scanning, setScanning] = useState(false);

  // Handle reveal
  const handleReveal = async (chainId) => {
    setRevealing(chainId);
    try {
      await revealChain(chainId);
    } finally {
      setRevealing(null);
    }
  };

  // Handle batch scan
  const handleScan = async () => {
    setScanning(true);
    try {
      await runBatchDetection(20);
    } finally {
      setScanning(false);
    }
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
            Chain Leads
          </h1>
          <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate'}`}>
            Guaranteed moves: buyers who still own another property
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleScan}
            disabled={scanning}
            className="bg-gradient-to-r from-teal to-emerald-500"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Scan for Chains
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={isLight ? 'bg-white border-slate-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isLight ? 'bg-emerald-50' : 'bg-teal/10'}`}>
                <Link2 className={`h-6 w-6 ${isLight ? 'text-emerald-600' : 'text-teal'}`} />
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate'}`}>Total Chains</p>
                <p className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
                  {count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={isLight ? 'bg-white border-slate-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isLight ? 'bg-green-50' : 'bg-green-500/10'}`}>
                <TrendingUp className={`h-6 w-6 ${isLight ? 'text-green-600' : 'text-green-500'}`} />
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate'}`}>High Confidence</p>
                <p className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
                  {chains.filter(c => c.confidence_score >= 80).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={isLight ? 'bg-white border-slate-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isLight ? 'bg-yellow-50' : 'bg-yellow-500/10'}`}>
                <Calendar className={`h-6 w-6 ${isLight ? 'text-yellow-600' : 'text-yellow-500'}`} />
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate'}`}>This Week</p>
                <p className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
                  {chains.filter(c => getDaysSinceDetection(c.detected_at) <= 7).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['detected', 'contacted', 'listed', 'sold'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status ? 'bg-teal hover:bg-teal/90' : ''}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>Error loading chains: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && chains.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal" />
        </div>
      )}

      {/* Empty State */}
      {!loading && chains.length === 0 && (
        <Card className={isLight ? 'bg-white border-slate-200' : ''}>
          <CardContent className="py-12">
            <div className="text-center">
              <Link2 className={`h-12 w-12 mx-auto mb-4 ${isLight ? 'text-slate-400' : 'text-slate'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
                No chains detected yet
              </h3>
              <p className={`text-sm mb-4 ${isLight ? 'text-slate-600' : 'text-slate'}`}>
                Click "Scan for Chains" to analyze recent sold listings
              </p>
              <Button onClick={handleScan} disabled={scanning}>
                {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Start Scanning
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chain Cards */}
      <div className="space-y-4">
        {chains.map((chain) => {
          const revealed = isRevealed(chain.id);
          const confidenceLabel = getConfidenceLabel(chain.confidence_score);
          const confidenceColor = getConfidenceColor(chain.confidence_score);
          const signals = formatMatchSignals(chain.match_signals);
          const daysSince = getDaysSinceDetection(chain.detected_at);

          return (
            <Card
              key={chain.id}
              className={`overflow-hidden ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-emerald-300'
                  : 'hover:border-teal/30'
              } transition-colors`}
            >
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Chain Indicator */}
                  <div className={`p-4 lg:p-6 flex items-center justify-center ${
                    chain.confidence_score >= 80
                      ? isLight ? 'bg-green-50' : 'bg-green-500/10'
                      : isLight ? 'bg-yellow-50' : 'bg-yellow-500/10'
                  }`}>
                    <div className="text-center">
                      <Link2 className={`h-8 w-8 mx-auto mb-2 ${
                        chain.confidence_score >= 80
                          ? isLight ? 'text-green-600' : 'text-green-500'
                          : isLight ? 'text-yellow-600' : 'text-yellow-500'
                      }`} />
                      <Badge className={confidenceColor}>
                        {chain.confidence_score}% {confidenceLabel}
                      </Badge>
                    </div>
                  </div>

                  {/* Chain Details */}
                  <div className="flex-1 p-4 lg:p-6">
                    {/* Buyer Name */}
                    <div className="flex items-center gap-2 mb-4">
                      <User className={`h-5 w-5 ${isLight ? 'text-emerald-600' : 'text-teal'}`} />
                      <span className={`font-semibold text-lg ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
                        {revealed ? chain.buyer_name : '••••• •••••'}
                      </span>
                      {daysSince <= 7 && (
                        <Badge variant="outline" className="text-xs border-teal text-teal">
                          New
                        </Badge>
                      )}
                    </div>

                    {/* Property Flow */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                      {/* Bought Property */}
                      <div className={`p-4 rounded-lg ${isLight ? 'bg-slate-50' : 'bg-lightest-navy/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Home className={`h-4 w-4 ${isLight ? 'text-emerald-600' : 'text-teal'}`} />
                          <span className={`text-xs font-medium uppercase ${isLight ? 'text-slate-500' : 'text-slate'}`}>
                            Bought
                          </span>
                        </div>
                        <p className={`font-medium ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
                          {revealed ? chain.sold_address : '••••• ••••• •••'}
                        </p>
                        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate'}`}>
                          {chain.sold_city}, {chain.sold_state}
                        </p>
                        {chain.sale_date && (
                          <p className={`text-xs mt-2 flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate'}`}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(chain.sale_date)}
                          </p>
                        )}
                        {chain.sale_price && (
                          <p className={`text-xs flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate'}`}>
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(chain.sale_price)}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="hidden md:flex items-center justify-center">
                        <ArrowRight className={`h-6 w-6 ${isLight ? 'text-slate-400' : 'text-slate'}`} />
                      </div>

                      {/* Still Owns */}
                      <div className={`p-4 rounded-lg border-2 border-dashed ${
                        isLight
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-teal/30 bg-teal/5'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className={`h-4 w-4 ${isLight ? 'text-emerald-600' : 'text-teal'}`} />
                          <span className={`text-xs font-medium uppercase ${isLight ? 'text-emerald-700' : 'text-teal'}`}>
                            Still Owns (Move Lead)
                          </span>
                        </div>
                        <p className={`font-medium ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
                          {revealed ? chain.owned_property_address : '••••• ••••• •••'}
                        </p>
                        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate'}`}>
                          {chain.owned_property_city}, {chain.owned_property_state}
                        </p>
                        <p className={`text-xs mt-2 ${isLight ? 'text-emerald-600' : 'text-teal'} font-medium`}>
                          <CheckCircle2 className="h-3 w-3 inline mr-1" />
                          Guaranteed move
                        </p>
                      </div>
                    </div>

                    {/* Match Signals */}
                    {signals.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {signals.map((signal, i) => (
                          <Badge key={i} variant="outline" className={`text-xs ${isLight ? 'border-slate-300' : ''}`}>
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`p-4 lg:p-6 flex items-center border-t lg:border-t-0 lg:border-l ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-white/[0.06] bg-lightest-navy/5'
                  }`}>
                    {revealed ? (
                      <div className="text-center w-full">
                        <CheckCircle2 className={`h-6 w-6 mx-auto mb-2 ${isLight ? 'text-emerald-600' : 'text-teal'}`} />
                        <p className={`text-sm font-medium ${isLight ? 'text-emerald-700' : 'text-teal'}`}>
                          Revealed
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleReveal(chain.id)}
                        disabled={revealing === chain.id}
                        className="w-full"
                      >
                        {revealing === chain.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        Reveal (1 credit)
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate'}`}>
            Page {page + 1} of {totalPages} ({count} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={!hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChainLeads;
