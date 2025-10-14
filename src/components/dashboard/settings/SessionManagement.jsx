import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  MapPin, 
  Clock, 
  LogOut,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const SessionManagement = () => {
  const { user, signOut, signOutAllDevices, getUserSessions } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await getUserSessions();
      
      if (error) {
        console.error('Error fetching sessions:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch session information.',
        });
        return;
      }

      // For now, we'll simulate session data since Supabase doesn't provide detailed session info
      // In a real implementation, you'd need to track this in your database
      const mockSessions = [
        {
          id: 'current',
          device: 'Desktop',
          browser: 'Chrome',
          os: 'Windows',
          location: 'New York, NY',
          ip: '192.168.1.1',
          lastActive: new Date().toISOString(),
          isCurrent: true,
          userAgent: navigator.userAgent,
        },
        {
          id: 'mobile',
          device: 'Mobile',
          browser: 'Safari',
          os: 'iOS',
          location: 'San Francisco, CA',
          ip: '192.168.1.2',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          isCurrent: false,
        },
      ];

      setSessions(mockSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (device) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceColor = (device) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return 'text-blue-500';
      case 'tablet':
        return 'text-purple-500';
      default:
        return 'text-teal';
    }
  };

  const formatLastActive = (lastActive) => {
    const now = new Date();
    const active = new Date(lastActive);
    const diffInMinutes = Math.floor((now - active) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const handleSignOutAll = async () => {
    setIsSigningOut(true);
    const { error } = await signOutAllDevices();
    setIsSigningOut(false);
    
    if (!error) {
      toast({
        title: 'Signed out from all devices',
        description: 'You have been signed out from all devices.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Session Management
          </h2>
          <p className="text-slate mt-1">
            Manage your active sessions and device access.
          </p>
        </div>
        
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Session Management
        </h2>
        <p className="text-slate mt-1">
          Manage your active sessions and device access.
        </p>
      </div>

      {/* Current Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Current Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate">Session ID</label>
              <p className="text-lightest-slate font-mono text-sm">{user?.id?.substring(0, 8)}...</p>
            </div>
            <div>
              <label className="text-sm text-slate">Last Activity</label>
              <p className="text-lightest-slate font-medium">Just now</p>
            </div>
            <div>
              <label className="text-sm text-slate">IP Address</label>
              <p className="text-lightest-slate font-medium">Current IP</p>
            </div>
            <div>
              <label className="text-sm text-slate">User Agent</label>
              <p className="text-lightest-slate font-medium text-xs truncate">
                {navigator.userAgent.substring(0, 50)}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active Sessions
            </span>
            <Badge variant="secondary">
              {sessions.length} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-light-navy/30 rounded-lg border border-lightest-navy/20"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full bg-light-navy ${getDeviceColor(session.device)}`}>
                    {getDeviceIcon(session.device)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lightest-slate font-medium">
                        {session.device} - {session.browser}
                      </h3>
                      {session.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {session.os}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatLastActive(session.lastActive)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {!session.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Actions */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            Security Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                Sign Out from All Devices
              </h3>
              <p className="text-slate mb-4">
                This will sign you out from all devices and revoke all active sessions. You'll need to sign in again on all devices.
              </p>
              
              <Button
                variant="destructive"
                onClick={handleSignOutAll}
                disabled={isSigningOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? 'Signing Out...' : 'Sign Out All Devices'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-lightest-slate font-medium">Regular Session Review</p>
                <p className="text-sm text-slate">Review your active sessions regularly and sign out from devices you no longer use.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-lightest-slate font-medium">Strong Passwords</p>
                <p className="text-sm text-slate">Use strong, unique passwords for your account and enable two-factor authentication when available.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-lightest-slate font-medium">Secure Networks</p>
                <p className="text-sm text-slate">Avoid signing in from public or unsecured networks.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionManagement;
