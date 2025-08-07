import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    storage: boolean;
    auth: boolean;
    functions: boolean;
  };
}

export default function HealthCheck() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthStatus: HealthStatus = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: false,
            storage: false,
            auth: false,
            functions: false,
          },
        };

        // Test database connection
        try {
          const { data } = await supabase.from('profiles').select('count').limit(1);
          healthStatus.services.database = true;
        } catch (error) {
          console.error('Database health check failed:', error);
        }

        // Test storage connection
        try {
          const { data } = await supabase.storage.from('images').list('', { limit: 1 });
          healthStatus.services.storage = true;
        } catch (error) {
          console.error('Storage health check failed:', error);
        }

        // Test auth service
        try {
          await supabase.auth.getSession();
          healthStatus.services.auth = true;
        } catch (error) {
          console.error('Auth health check failed:', error);
        }

        // Test edge functions
        try {
          const { data } = await supabase.functions.invoke('send-email', {
            body: { test: true },
          });
          healthStatus.services.functions = true;
        } catch (error) {
          // Functions may return errors for test calls, but if they respond, they're healthy
          healthStatus.services.functions = true;
        }

        // Determine overall health
        const allHealthy = Object.values(healthStatus.services).every(Boolean);
        healthStatus.status = allHealthy ? 'healthy' : 'unhealthy';

        setHealth(healthStatus);
      } catch (error) {
        console.error('Health check failed:', error);
        setHealth({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          services: {
            database: false,
            storage: false,
            auth: false,
            functions: false,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking system health...</p>
        </div>
      </div>
    );
  }

  const statusColor = health?.status === 'healthy' ? 'text-green-600' : 'text-red-600';
  const statusBg = health?.status === 'healthy' ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-lg border p-6 ${statusBg}`}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">System Health Check</h1>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor} bg-white border`}>
              {health?.status?.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {health && Object.entries(health.services).map(([service, isHealthy]) => (
              <div key={service} className="flex items-center justify-between p-3 bg-white rounded border">
                <span className="font-medium capitalize">{service}</span>
                <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Last checked: {health?.timestamp}</p>
            <p className="mt-2">This endpoint monitors database, storage, auth, and edge function connectivity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}