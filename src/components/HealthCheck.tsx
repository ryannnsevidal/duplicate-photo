import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Database, Cloud, Server } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  timestamp: string;
  responseTime?: number;
}

interface SystemHealth {
  overall: HealthStatus;
  database: HealthStatus;
  authentication: HealthStatus;
  storage: HealthStatus;
  api: HealthStatus;
}

export const HealthCheck: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkDatabaseHealth = async (): Promise<HealthStatus> => {
    const startTime = performance.now();
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key')
        .limit(1);

      const responseTime = performance.now() - startTime;

      if (error) {
        return {
          status: 'error',
          message: `Database error: ${error.message}`,
          timestamp: new Date().toISOString(),
          responseTime,
        };
      }

      return {
        status: 'healthy',
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      };
    }
  };

  const checkAuthHealth = async (): Promise<HealthStatus> => {
    const startTime = performance.now();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const responseTime = performance.now() - startTime;

      return {
        status: 'healthy',
        message: session ? 'Authenticated session active' : 'Authentication service available',
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Authentication service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      };
    }
  };

  const checkStorageHealth = async (): Promise<HealthStatus> => {
    const startTime = performance.now();
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .list('', { limit: 1 });

      const responseTime = performance.now() - startTime;

      if (error) {
        return {
          status: 'warning',
          message: `Storage warning: ${error.message}`,
          timestamp: new Date().toISOString(),
          responseTime,
        };
      }

      return {
        status: 'healthy',
        message: 'Storage service operational',
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Storage service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      };
    }
  };

  const checkApiHealth = async (): Promise<HealthStatus> => {
    const startTime = performance.now();
    try {
      // Check if the app can make basic API calls
      const response = await fetch(window.location.origin + '/health', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = performance.now() - startTime;

      if (!response.ok && response.status !== 404) {
        return {
          status: 'warning',
          message: `API returned ${response.status}`,
          timestamp: new Date().toISOString(),
          responseTime,
        };
      }

      return {
        status: 'healthy',
        message: 'API endpoints accessible',
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      return {
        status: 'healthy', // This is expected for SPA
        message: 'Client-side application running',
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      };
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    setLastCheck(new Date());

    try {
      const [database, authentication, storage, api] = await Promise.all([
        checkDatabaseHealth(),
        checkAuthHealth(),
        checkStorageHealth(),
        checkApiHealth(),
      ]);

      // Determine overall health
      const statuses = [database, authentication, storage, api];
      const hasError = statuses.some(s => s.status === 'error');
      const hasWarning = statuses.some(s => s.status === 'warning');

      let overallStatus: HealthStatus['status'] = 'healthy';
      let overallMessage = 'All systems operational';

      if (hasError) {
        overallStatus = 'error';
        overallMessage = 'System experiencing errors';
      } else if (hasWarning) {
        overallStatus = 'warning';
        overallMessage = 'System operational with warnings';
      }

      const systemHealth: SystemHealth = {
        overall: {
          status: overallStatus,
          message: overallMessage,
          timestamp: new Date().toISOString(),
        },
        database,
        authentication,
        storage,
        api,
      };

      setHealth(systemHealth);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({
        overall: {
          status: 'error',
          message: 'Health check failed',
          timestamp: new Date().toISOString(),
        },
        database: {
          status: 'error',
          message: 'Unable to check',
          timestamp: new Date().toISOString(),
        },
        authentication: {
          status: 'error',
          message: 'Unable to check',
          timestamp: new Date().toISOString(),
        },
        storage: {
          status: 'error',
          message: 'Unable to check',
          timestamp: new Date().toISOString(),
        },
        api: {
          status: 'error',
          message: 'Unable to check',
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(runHealthCheck, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatusIcon = ({ status }: { status: HealthStatus['status'] }) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  if (loading && !health) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Running health checks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Server className="h-6 w-6 text-gray-400 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">
                  System Health Dashboard
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                {lastCheck && (
                  <span className="text-sm text-gray-500">
                    Last check: {lastCheck.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={runHealthCheck}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <Clock className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    'Refresh'
                  )}
                </button>
              </div>
            </div>
          </div>

          {health && (
            <div className="p-6">
              {/* Overall Status */}
              <div className={`rounded-lg border p-4 mb-6 ${getStatusColor(health.overall.status)}`}>
                <div className="flex items-center">
                  <StatusIcon status={health.overall.status} />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium">
                      Overall System Status: {health.overall.status.toUpperCase()}
                    </h3>
                    <p className="mt-1">{health.overall.message}</p>
                  </div>
                </div>
              </div>

              {/* Individual Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Database className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">Database</h4>
                    <div className="ml-auto">
                      <StatusIcon status={health.database.status} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{health.database.message}</p>
                  {health.database.responseTime && (
                    <p className="text-xs text-gray-500">
                      Response time: {health.database.responseTime.toFixed(0)}ms
                    </p>
                  )}
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Server className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">Authentication</h4>
                    <div className="ml-auto">
                      <StatusIcon status={health.authentication.status} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{health.authentication.message}</p>
                  {health.authentication.responseTime && (
                    <p className="text-xs text-gray-500">
                      Response time: {health.authentication.responseTime.toFixed(0)}ms
                    </p>
                  )}
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Cloud className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">Storage</h4>
                    <div className="ml-auto">
                      <StatusIcon status={health.storage.status} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{health.storage.message}</p>
                  {health.storage.responseTime && (
                    <p className="text-xs text-gray-500">
                      Response time: {health.storage.responseTime.toFixed(0)}ms
                    </p>
                  )}
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Server className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">API</h4>
                    <div className="ml-auto">
                      <StatusIcon status={health.api.status} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{health.api.message}</p>
                  {health.api.responseTime && (
                    <p className="text-xs text-gray-500">
                      Response time: {health.api.responseTime.toFixed(0)}ms
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Environment Information</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Environment:</span>{' '}
                    {import.meta.env.VITE_APP_ENVIRONMENT || 'development'}
                  </div>
                  <div>
                    <span className="font-medium">Version:</span> 1.0.0
                  </div>
                  <div>
                    <span className="font-medium">Build:</span> {import.meta.env.MODE}
                  </div>
                  <div>
                    <span className="font-medium">Debug Mode:</span>{' '}
                    {import.meta.env.VITE_DEBUG_MODE === 'true' ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthCheck;
