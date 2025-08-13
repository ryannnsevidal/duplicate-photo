import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Eye, Clock, AlertTriangle, Users, Activity } from 'lucide-react';
import { BlockedDomainsManager } from '@/components/admin/BlockedDomainsManager';
import { useSecurity } from '@/hooks/useSecurity';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource?: string;
  success: boolean;
  error_message?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export function AdminPanel() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { getAuditLogs, assignRole } = useSecurity();
  const { toast } = useToast();

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await getAuditLogs(100);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const getActionBadgeVariant = (action: string, success: boolean) => {
    if (!success) return 'destructive';
    
    if (action.includes('login') || action.includes('session')) return 'default';
    if (action.includes('upload')) return 'secondary';
    if (action.includes('rate_limit')) return 'destructive';
    if (action.includes('security')) return 'outline';
    
    return 'default';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const securityStats = {
    totalLogs: auditLogs.length,
    failedActions: auditLogs.filter(log => !log.success).length,
    rateLimitViolations: auditLogs.filter(log => log.action.includes('rate_limit')).length,
    uniqueUsers: new Set(auditLogs.map(log => log.user_id).filter(Boolean)).size
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 py-8"
    >
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Security Administration</h1>
        </motion.div>
        <p className="text-muted-foreground">
          Monitor security events, audit logs, and manage user permissions
        </p>
      </div>

      {/* Security Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.totalLogs}</div>
            <p className="text-xs text-muted-foreground">Security events logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{securityStats.failedActions}</div>
            <p className="text-xs text-muted-foreground">Security failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{securityStats.rateLimitViolations}</div>
            <p className="text-xs text-muted-foreground">Rate limit violations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{securityStats.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Unique active users</p>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="audit-logs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="security-events">Security Events</TabsTrigger>
          <TabsTrigger value="blocked-domains">Blocked Domains</TabsTrigger>
          <TabsTrigger value="user-management">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="audit-logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Security Audit Log
                  </CardTitle>
                  <CardDescription>
                    Comprehensive log of all security-related events and user actions
                  </CardDescription>
                </div>
                <Button onClick={loadAuditLogs} disabled={loading}>
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={getActionBadgeVariant(log.action, log.success)}
                            className="text-xs"
                          >
                            {log.action}
                          </Badge>
                          {log.resource && (
                            <Badge variant="outline" className="text-xs">
                              {log.resource}
                            </Badge>
                          )}
                          {!log.success && (
                            <Badge variant="destructive" className="text-xs">
                              FAILED
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <strong>User:</strong> {log.user_id || 'Anonymous'}
                        </div>
                        
                        {log.error_message && (
                          <div className="text-sm text-destructive">
                            <strong>Error:</strong> {log.error_message}
                          </div>
                        )}
                        
                        {Object.keys(log.metadata || {}).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Metadata
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        {formatTimestamp(log.created_at)}
                      </div>
                    </motion.div>
                  ))}
                  
                  {auditLogs.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security-events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Events
              </CardTitle>
              <CardDescription>
                Critical security events requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs
                  .filter(log => !log.success || log.action.includes('rate_limit') || log.action.includes('security'))
                  .slice(0, 20)
                  .map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 border rounded-lg ${
                        !log.success ? 'border-destructive bg-destructive/5' : 'border-orange-500 bg-orange-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge 
                          variant={log.success ? "outline" : "destructive"}
                          className="text-xs"
                        >
                          {log.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(log.created_at)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <strong>User:</strong> {log.user_id || 'Anonymous'}
                      </div>
                      {log.error_message && (
                        <div className="text-sm text-destructive mt-1">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked-domains" className="space-y-6">
          <BlockedDomainsManager />
        </TabsContent>

        <TabsContent value="user-management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                User management features will be implemented here.
                <br />
                Assign roles, manage permissions, and monitor user activity.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}