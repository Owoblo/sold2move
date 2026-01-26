import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Smartphone,
  PhoneCall,
  Clock,
  Copy,
  ExternalLink
} from 'lucide-react';
import toast from '@/lib/toast';
import { homeownerLookupService } from '@/services/homeownerLookup';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Display homeowner contact information in a card format
 */
const HomeownerInfoCard = ({ data, loading, error, noDataFound, onRetry }) => {
  const { formatPhoneNumber, getScoreColor, getPhoneTypeBadge } = homeownerLookupService;
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Copy to clipboard helper
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied', `${label} copied to clipboard`);
    } catch {
      toast.error('Failed', 'Could not copy to clipboard');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">Loading Homeowner Info...</span>
        </div>
        <div className="space-y-3">
          <div className="h-4 rounded w-3/4" style={{ backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)' }}></div>
          <div className="h-4 rounded w-1/2" style={{ backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)' }}></div>
          <div className="h-4 rounded w-2/3" style={{ backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)' }}></div>
        </div>
      </div>
    );
  }

  // Error state - actual API/network errors
  if (error) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">Lookup Failed</span>
        </div>
        <p className="text-sm mb-4" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
          {error.message || 'Could not retrieve homeowner information. Please check your connection and try again.'}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // No data found state - API worked but no homeowner data exists for this property
  if (noDataFound) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4" style={{ color: isLight ? '#f59e0b' : '#fbbf24' }}>
          <User className="h-5 w-5" />
          <span className="font-semibold">No Homeowner Data Available</span>
        </div>
        <p className="text-sm mb-4" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
          We couldn't find homeowner contact information for this property. This can happen if:
        </p>
        <ul className="text-sm mb-4 list-disc list-inside space-y-1" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
          <li>The property is owned by a trust or LLC</li>
          <li>The owner's information is not publicly available</li>
          <li>This is a newly sold property and records haven't been updated</li>
        </ul>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // No data state
  if (!data) {
    return null;
  }

  // Check if we have any meaningful data
  const hasName = data.firstName || data.lastName;
  const hasPhones = data.phoneNumbers && data.phoneNumbers.length > 0;
  const hasEmails = data.emails && data.emails.length > 0;
  const hasAnyData = hasName || hasPhones || hasEmails;

  if (!hasAnyData) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">Homeowner Information</span>
        </div>
        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
          No homeowner information found for this address.
        </p>
      </div>
    );
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">Homeowner Information</span>
        </div>
        <div className="flex items-center gap-2">
          {data.fromCache && (
            <Badge variant="outline" className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8', borderColor: isLight ? '#d1d5db' : 'rgba(148, 163, 184, 0.3)' }}>
              <Clock className="h-3 w-3 mr-1" />
              Cached
            </Badge>
          )}
          {data.isLitigator && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              TCPA Litigator
            </Badge>
          )}
        </div>
      </div>

      {/* Owner Name */}
      {hasName && (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 255, 136, 0.1)' }}>
            <User className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Property Owner</p>
            <p className="text-lg font-semibold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{fullName}</p>
          </div>
        </div>
      )}

      {/* Phone Numbers */}
      {hasPhones && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
            <Phone className="h-4 w-4" />
            Phone Numbers ({data.phoneNumbers.length})
          </p>
          <div className="space-y-2">
            {data.phoneNumbers.map((phone, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-3">
                  {phone.type?.toLowerCase().includes('mobile') ? (
                    <Smartphone className="h-4 w-4" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                  ) : (
                    <PhoneCall className="h-4 w-4" style={{ color: isLight ? '#64748b' : '#94a3b8' }} />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                        {formatPhoneNumber(phone.number)}
                      </span>
                      <Badge variant={getPhoneTypeBadge(phone.type)} className="text-xs">
                        {phone.type || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                      {phone.carrier && phone.carrier !== 'Unknown' && (
                        <span>{phone.carrier}</span>
                      )}
                      {phone.score && (
                        <span className={getScoreColor(phone.score)}>
                          Score: {phone.score}
                        </span>
                      )}
                      {phone.reachable && (
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Reachable
                        </span>
                      )}
                      {phone.dnc && (
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> DNC
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(phone.number, 'Phone number')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <a href={`tel:${phone.number}`}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Addresses */}
      {hasEmails && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
            <Mail className="h-4 w-4" />
            Email Addresses ({data.emails.length})
          </p>
          <div className="space-y-2">
            {data.emails.map((emailObj, index) => {
              const email = typeof emailObj === 'string' ? emailObj : emailObj.email;
              const tested = typeof emailObj === 'object' ? emailObj.tested : false;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                    <div>
                      <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{email}</span>
                      {tested && (
                        <Badge variant="outline" className="ml-2 text-xs text-green-500 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(email, 'Email')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 w-8 p-0"
                    >
                      <a href={`mailto:${email}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warning for DNC/Litigator */}
      {(data.isLitigator || data.hasDncPhone) && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {data.isLitigator
                ? 'This person is flagged as a TCPA litigator. Use caution when contacting.'
                : 'Some phone numbers are on the Do Not Call registry.'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default HomeownerInfoCard;
