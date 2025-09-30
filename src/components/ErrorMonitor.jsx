import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bug, Database, Wifi, Server, Clock, XCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ErrorMonitor = ({ isOpen, onClose }) => {
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    byType: {}
  });

  useEffect(() => {
    // Load errors from localStorage (in a real app, this would come from an API)
    const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    setErrors(storedErrors);

    // Calculate stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayErrors = storedErrors.filter(error => 
      new Date(error.timestamp) >= today
    );
    
    const weekErrors = storedErrors.filter(error => 
      new Date(error.timestamp) >= weekAgo
    );

    const byType = storedErrors.reduce((acc, error) => {
      const type = error.code || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    setStats({
      total: storedErrors.length,
      today: todayErrors.length,
      thisWeek: weekErrors.length,
      byType
    });
  }, []);

  const clearErrors = () => {
    localStorage.removeItem('app_errors');
    setErrors([]);
    setStats({
      total: 0,
      today: 0,
      thisWeek: 0,
      byType: {}
    });
  };

  const getErrorIcon = (code) => {
    switch (code) {
      case 'COLUMN_NOT_FOUND':
      case 'TABLE_NOT_FOUND':
        return <Database className="h-4 w-4 text-red-500" />;
      case 'CONNECTION_FAILED':
      case 'NETWORK_ERROR':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return <XCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bug className="h-4 w-4 text-slate" />;
    }
  };

  const getErrorSeverity = (code) => {
    switch (code) {
      case 'COLUMN_NOT_FOUND':
      case 'TABLE_NOT_FOUND':
        return 'critical';
      case 'CONNECTION_FAILED':
      case 'UNAUTHORIZED':
        return 'high';
      case 'RATE_LIMITED':
        return 'medium';
      default:
        return 'low';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-slate';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] bg-light-navy border-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Error Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={clearErrors} variant="outline" size="sm">
              Clear All
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="errors">Recent Errors</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-deep-navy/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Bug className="h-5 w-5 text-red-500" />
                      <span className="text-sm text-slate">Total Errors</span>
                    </div>
                    <div className="text-2xl font-bold text-lightest-slate mt-2">
                      {stats.total}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-deep-navy/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm text-slate">Today</span>
                    </div>
                    <div className="text-2xl font-bold text-lightest-slate mt-2">
                      {stats.today}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-deep-navy/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-green" />
                      <span className="text-sm text-slate">This Week</span>
                    </div>
                    <div className="text-2xl font-bold text-lightest-slate mt-2">
                      {stats.thisWeek}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-deep-navy/30">
                <CardHeader>
                  <CardTitle className="text-lg">Error Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-2 rounded bg-deep-navy/50">
                        <div className="flex items-center gap-2">
                          {getErrorIcon(type)}
                          <span className="text-sm text-slate">{type}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="errors" className="space-y-4">
              <div className="space-y-3">
                {errors.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green mx-auto mb-4" />
                    <p className="text-slate">No errors recorded</p>
                  </div>
                ) : (
                  errors.slice(0, 50).map((error, index) => {
                    const severity = getErrorSeverity(error.code);
                    return (
                      <Card key={index} className="bg-deep-navy/30">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)} mt-1`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {getErrorIcon(error.code)}
                                <span className="font-medium text-lightest-slate">
                                  {error.code || 'Unknown Error'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate mb-2">{error.message}</p>
                              <div className="flex items-center gap-4 text-xs text-slate">
                                <span>{new Date(error.timestamp).toLocaleString()}</span>
                                {error.context?.operation && (
                                  <span>Operation: {error.context.operation}</span>
                                )}
                              </div>
                              {error.context && (
                                <details className="mt-2">
                                  <summary className="text-xs text-slate cursor-pointer hover:text-lightest-slate">
                                    View Context
                                  </summary>
                                  <pre className="mt-2 p-2 bg-black/20 rounded text-xs overflow-auto">
                                    {JSON.stringify(error.context, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              <Card className="bg-deep-navy/30">
                <CardHeader>
                  <CardTitle className="text-lg">Error Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate text-sm">
                    Error tracking and analytics would be implemented here in a production environment.
                    This could include charts, trends, and more detailed statistics.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorMonitor;
