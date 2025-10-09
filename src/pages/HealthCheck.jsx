import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Server, Zap, CreditCard } from 'lucide-react';
import { fullHealthCheck } from '@/utils/healthCheck';

const HealthCheck = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const result = await fullHealthCheck();
      setHealthData(result);
      setLastChecked(new Date().toISOString());
    } catch (error) {
      setHealthData({
        overall: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-teal-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const renderErrorMessage = (error) => {
    if (!error) return null;
    
    // Handle different error types
    if (typeof error === 'string') {
      return error;
    }
    
    if (error && typeof error === 'object' && error.message) {
      return error.message;
    }
    
    if (error && typeof error === 'object' && error.toString) {
      return error.toString();
    }
    
    return 'Unknown error occurred';
  };

  const getStatusBadge = (status) => {
    const variants = {
      healthy: 'default',
      error: 'destructive',
      degraded: 'secondary'
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading && !healthData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-teal" />
            <span className="text-lg">Running health checks...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-lightest-slate flex items-center gap-2">
            <Zap className="h-8 w-8 text-teal" />
            System Health Check
          </h1>
          <p className="text-slate mt-2">
            Monitor the health of your application and database connections
          </p>
        </div>
        <Button 
          onClick={runHealthCheck} 
          disabled={loading}
          className="bg-teal text-deep-navy hover:bg-teal/90"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            {getStatusIcon(healthData?.overall)}
            Overall System Status
            {getStatusBadge(healthData?.overall)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-lightest-slate">
                {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
              <div className="text-sm text-slate">Last Checked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-lightest-slate">
                {healthData?.checks ? Object.keys(healthData.checks).length : 0}
              </div>
              <div className="text-sm text-slate">Checks Performed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal">
                {healthData?.checks ? Object.values(healthData.checks).filter(c => c.status === 'healthy').length : 0}
              </div>
              <div className="text-sm text-slate">Healthy Services</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* App Health */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Application
              {getStatusBadge(healthData?.checks?.app?.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData?.checks?.app ? (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-slate">Version:</span>
                  <span className="text-lightest-slate ml-2">{healthData.checks.app.version}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate">Environment:</span>
                  <span className="text-lightest-slate ml-2">{healthData.checks.app.environment}</span>
                </div>
                {healthData.checks.app.error && (
                  <div className="text-sm text-red-400">
                    Error: {renderErrorMessage(healthData.checks.app.error)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Supabase Health */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Supabase Connection
              {getStatusBadge(healthData?.checks?.supabase?.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData?.checks?.supabase ? (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-slate">Connected:</span>
                  <span className={`ml-2 ${healthData.checks.supabase.connected ? 'text-teal' : 'text-red-400'}`}>
                    {healthData.checks.supabase.connected ? 'Yes' : 'No'}
                  </span>
                </div>
                {healthData.checks.supabase.message && (
                  <div className="text-sm text-teal">
                    {healthData.checks.supabase.message}
                  </div>
                )}
                {healthData.checks.supabase.error && (
                  <div className="text-sm text-red-400">
                    Error: {renderErrorMessage(healthData.checks.supabase.error)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Database Health */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Data
              {getStatusBadge(healthData?.checks?.database?.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData?.checks?.database ? (
              <div className="space-y-2">
                {healthData.checks.database.data ? (
                  <>
                    <div className="text-sm">
                      <span className="text-slate">Runs:</span>
                      <span className="text-lightest-slate ml-2">
                        {healthData.checks.database.data.runs?.count || 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate">Current Listings:</span>
                      <span className="text-lightest-slate ml-2">
                        {healthData.checks.database.data.current_listings?.count || 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate">Just Listed:</span>
                      <span className="text-lightest-slate ml-2">
                        {healthData.checks.database.data.just_listed?.count || 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate">Sold Listings:</span>
                      <span className="text-lightest-slate ml-2">
                        {healthData.checks.database.data.sold_listings?.count || 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate">Latest Run:</span>
                      <span className="text-lightest-slate ml-2">
                        {healthData.checks.database.data.runs?.latest && healthData.checks.database.data.runs.latest !== 'none' 
                          ? new Date(healthData.checks.database.data.runs.latest).toLocaleDateString()
                          : 'None'
                        }
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-red-400">
                    Error: {renderErrorMessage(healthData.checks.database.error)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Payment Health */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Workflow
              {getStatusBadge(healthData?.checks?.payment?.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData?.checks?.payment ? (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-slate">Mode:</span>
                  <span className={`ml-2 ${healthData.checks.payment.testMode ? 'text-yellow-400' : 'text-teal'}`}>
                    {healthData.checks.payment.testMode ? 'Test' : 'Live'}
                  </span>
                </div>
                
                {/* Plan-specific status */}
                {healthData.checks.payment.plans && Object.keys(healthData.checks.payment.plans).length > 0 && (
                  <div className="space-y-1 mt-2">
                    <div className="text-sm font-medium text-slate">Plan Status:</div>
                    {Object.entries(healthData.checks.payment.plans).map(([planKey, status]) => (
                      <div key={planKey} className="text-sm flex justify-between">
                        <span className="text-slate capitalize">{planKey}:</span>
                        <span className={`${
                          status === 'working' ? 'text-teal' :
                          status === 'requires_auth' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {status === 'requires_auth' ? 'Auth Required' : status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                    {healthData.checks.payment.subscriptionCheckout && (
                      <div className="text-sm">
                        <span className="text-slate">Subscriptions:</span>
                        <span className={`ml-2 ${
                          healthData.checks.payment.subscriptionCheckout === 'working' ? 'text-teal' :
                          healthData.checks.payment.subscriptionCheckout === 'customer_migration_needed' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {healthData.checks.payment.subscriptionCheckout === 'customer_migration_needed' ? 'Migration Needed' : healthData.checks.payment.subscriptionCheckout}
                        </span>
                      </div>
                    )}
                {healthData.checks.payment.oneTimePayment && (
                  <div className="text-sm">
                    <span className="text-slate">One-time:</span>
                    <span className="text-teal ml-2">{healthData.checks.payment.oneTimePayment}</span>
                  </div>
                )}
                {healthData.checks.payment.message && (
                  <div className="text-sm text-teal">
                    {healthData.checks.payment.message}
                  </div>
                )}
                {healthData.checks.payment.note && (
                  <div className="text-sm text-yellow-400">
                    {healthData.checks.payment.note}
                  </div>
                )}
                {healthData.checks.payment.error && (
                  <div className="text-sm text-red-400">
                    Error: {renderErrorMessage(healthData.checks.payment.error)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raw Data (for debugging) */}
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle>Raw Health Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-slate bg-deep-navy p-4 rounded overflow-auto">
            {JSON.stringify(healthData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthCheck;
