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

/**
 * Display homeowner contact information in a card format
 */
const HomeownerInfoCard = ({ data, loading, error, onRetry }) => {
  const { formatPhoneNumber, getScoreColor, getPhoneTypeBadge } = homeownerLookupService;

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
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Loading Homeowner Info...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-lightest-navy/20 rounded w-3/4"></div>
            <div className="h-4 bg-lightest-navy/20 rounded w-1/2"></div>
            <div className="h-4 bg-lightest-navy/20 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Lookup Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate text-sm mb-4">
            {error.message || 'Could not retrieve homeowner information'}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Homeowner Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate text-sm">
            No homeowner information found for this address.
          </p>
        </CardContent>
      </Card>
    );
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-teal" />
            Homeowner Information
          </div>
          <div className="flex items-center gap-2">
            {data.fromCache && (
              <Badge variant="outline" className="text-xs text-slate border-slate/30">
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Owner Name */}
        {hasName && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal/10 rounded-lg">
              <User className="h-5 w-5 text-teal" />
            </div>
            <div>
              <p className="text-sm text-slate">Property Owner</p>
              <p className="text-lg font-semibold text-lightest-slate">{fullName}</p>
            </div>
          </div>
        )}

        {/* Phone Numbers */}
        {hasPhones && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Numbers ({data.phoneNumbers.length})
            </p>
            <div className="space-y-2">
              {data.phoneNumbers.map((phone, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-lightest-navy/10 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {phone.type?.toLowerCase().includes('mobile') ? (
                      <Smartphone className="h-4 w-4 text-teal" />
                    ) : (
                      <PhoneCall className="h-4 w-4 text-slate" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lightest-slate">
                          {formatPhoneNumber(phone.number)}
                        </span>
                        <Badge variant={getPhoneTypeBadge(phone.type)} className="text-xs">
                          {phone.type || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate">
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
            <p className="text-sm font-medium text-slate flex items-center gap-2">
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
                    className="flex items-center justify-between p-3 bg-lightest-navy/10 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-teal" />
                      <div>
                        <span className="text-lightest-slate">{email}</span>
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
      </CardContent>
    </Card>
  );
};

export default HomeownerInfoCard;
