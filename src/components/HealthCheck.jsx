import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Server, Database, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { handleHealthCheckError } from '@/lib/errorHandler';

const HealthCheck = ({ onStatusChange }) => {
  const [status, setStatus] = useState({
    overall: 'checking',
    supabase: 'checking',
    api: 'checking',
    network: 'checking'
  });
  const [lastChecked, setLastChecked] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkSupabaseHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return { status: 'healthy', message: 'Supabase is responding' };
      } else {
        return { status: 'unhealthy', message: `Supabase returned ${response.status}` };
      }
    } catch (error) {
      handleHealthCheckError(error, 'Supabase');
      return { status: 'unhealthy', message: error.message };
    }
  };

  const checkNetworkHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return { status: 'healthy', message: 'Network connection is working' };
    } catch (error) {
      handleHealthCheckError(error, 'Network');
      return { status: 'unhealthy', message: 'Network connection failed' };
    }
  };

  const checkApiHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // Check if we can make a simple query to our database
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/runs?select=id&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return { status: 'healthy', message: 'API queries are working' };
      } else {
        return { status: 'unhealthy', message: `API returned ${response.status}` };
      }
    } catch (error) {
      handleHealthCheckError(error, 'API');
      return { status: 'unhealthy', message: error.message };
    }
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    console.log('🔍 Starting health check...');

    try {
      const [supabaseResult, networkResult, apiResult] = await Promise.allSettled([
        checkSupabaseHealth(),
        checkNetworkHealth(),
        checkApiHealth()
      ]);

      const newStatus = {
        supabase: supabaseResult.status === 'fulfilled' ? supabaseResult.value.status : 'unhealthy',
        network: networkResult.status === 'fulfilled' ? networkResult.value.status : 'unhealthy',
        api: apiResult.status === 'fulfilled' ? apiResult.value.status : 'unhealthy'
      };

      // Determine overall status
      const allHealthy = Object.values(newStatus).every(s => s === 'healthy');
      newStatus.overall = allHealthy ? 'healthy' : 'unhealthy';

      setStatus(newStatus);
      setLastChecked(new Date());
      
      console.log('✅ Health check completed:', newStatus);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      setStatus({
        overall: 'unhealthy',
        supabase: 'unhealthy',
        network: 'unhealthy',
        api: 'unhealthy'
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
    
    // Run health check every 10 minutes to reduce performance impact
    const interval = setInterval(runHealthCheck, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-teal" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-slate" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-teal text-deep-navy">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card className="bg-light-navy border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Health
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge(status.overall)}
            <Button
              onClick={runHealthCheck}
              disabled={isChecking}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {lastChecked && (
          <p className="text-xs text-slate">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2 rounded bg-deep-navy/30">
            <Database className="h-4 w-4 text-slate" />
            <span className="text-sm text-slate">Database</span>
            <div className="ml-auto flex items-center gap-1">
              {getStatusIcon(status.supabase)}
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded bg-deep-navy/30">
            <Wifi className="h-4 w-4 text-slate" />
            <span className="text-sm text-slate">Network</span>
            <div className="ml-auto flex items-center gap-1">
              {getStatusIcon(status.network)}
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded bg-deep-navy/30">
            <Server className="h-4 w-4 text-slate" />
            <span className="text-sm text-slate">API</span>
            <div className="ml-auto flex items-center gap-1">
              {getStatusIcon(status.api)}
            </div>
          </div>
        </div>

        {status.overall === 'unhealthy' && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              Some services are experiencing issues. Please try refreshing the page or contact support if problems persist.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthCheck;
