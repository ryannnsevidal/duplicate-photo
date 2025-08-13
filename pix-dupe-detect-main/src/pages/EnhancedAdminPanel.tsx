import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, Eye, Clock, AlertTriangle, Users, Activity, 
  TrendingUp, Ban, CheckCircle, XCircle, Globe, Monitor,
  Database, Lock, UserCheck, Zap
} from 'lucide-react';
import { useEnhancedSecurity, SecurityStats } from '@/hooks/useEnhancedSecurity';
import { useSecurity } from '@/hooks/useSecurity';
import { useToast } from '@/hooks/use-toast';

interface IPBlocking {
  ip_address: string;
  score_delta: number;
  block_reason: string;
}

export function EnhancedAdminPanel() {
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [ipBlockForm, setIpBlockForm] = useState<IPBlocking>({
    ip_address: '',
    score_delta: -50,
    block_reason: ''
  });
  const [loading, setLoading] = useState(true);
  
  const { 
    getSecurityStats, 
    updateIPReputation, 
    checkIPReputation,
    loading: securityLoading 
  } = useEnhancedSecurity();
  const { getAuditLogs } = useSecurity();
  const { toast } = useToast();

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [stats, logs] = await Promise.all([
        getSecurityStats(),
        getAuditLogs(100)
      ]);
      
      if (stats) setSecurityStats(stats);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const handleIPBlock = async () => {
    if (!ipBlockForm.ip_address || !ipBlockForm.block_reason) {
      toast({
        title: "Invalid Input",
        description: "Please provide IP address and block reason",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateIPReputation(ipBlockForm);
      toast({
        title: "IP Blocked Successfully",
        description: `IP ${ipBlockForm.ip_address} has been blocked`,
      });
      
      setIpBlockForm({ ip_address: '', score_delta: -50, block_reason: '' });
      loadSecurityData(); // Refresh data
    } catch (error) {
      toast({
        title: "Block Failed",
        description: "Failed to block IP address",
        variant: "destructive",
      });
    }
  };

  const checkIPStatus = async (ip: string) => {
    if (!ip) return;
    
    try {
      const reputation = await checkIPReputation(ip);
      toast({
        title: "IP Reputation Check",
        description: `Score: ${reputation.score}, Blocked: ${reputation.blocked ? 'Yes' : 'No'}`,
      });
    } catch (error) {
      toast({
        title: "Check Failed",
        description: "Failed to check IP reputation",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSecurityLevel = (score: number) => {
    if (score >= 80) return { level: 'High', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (score >= 60) return { level: 'Medium', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    if (score >= 40) return { level: 'Low', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
    return { level: 'Critical', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  };

  const overallSecurityScore = securityStats ? 
    Math.max(0, 100 - (securityStats.failed_logs * 2) - (securityStats.blocked_ips * 5)) : 0;
  
  const securityLevel = getSecurityLevel(overallSecurityScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 py-8"
    >
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Enhanced Security Command Center</h1>
        </motion.div>
        <p className="text-muted-foreground">
          Real-time security monitoring, threat intelligence, and access control management
        </p>
      </div>

      {/* Security Overview Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <Card className={`border-2 ${securityLevel.bgColor}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className={`h-4 w-4 ${securityLevel.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${securityLevel.color}`}>
              {overallSecurityScore}/100
            </div>
            <p className="text-xs text-muted-foreground">
              Security Level: {securityLevel.level}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {securityStats?.blocked_ips || 0}
            </div>
            <p className="text-xs text-muted-foreground">Blocked IP addresses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {securityStats?.failed_logs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Security failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {securityStats?.active_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Live user sessions</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="real-time" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="real-time">Real-Time Monitor</TabsTrigger>
          <TabsTrigger value="ip-management">IP Management</TabsTrigger>
          <TabsTrigger value="audit-logs">Security Audit</TabsTrigger>
          <TabsTrigger value="threat-intel">Threat Intelligence</TabsTrigger>
          <TabsTrigger value="access-control">Access Control</TabsTrigger>
        </TabsList>

        {/* Real-Time Monitoring */}
        <TabsContent value="real-time" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Security Events
                </CardTitle>
                <CardDescription>Live feed of security-related activities</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {securityStats?.recent_violations?.map((violation: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive" className="text-xs">
                              Severity {violation.severity_level}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {violation.action}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            IP: {violation.ip_address || 'Unknown'}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(violation.created_at)}
                        </div>
                      </motion.div>
                    ))}
                    
                    {(!securityStats?.recent_violations || securityStats.recent_violations.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        No recent security violations
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Security Metrics
                </CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span className="font-medium">Total Events</span>
                    </div>
                    <span className="text-xl font-bold">{securityStats?.total_logs || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span className="font-medium">Success Rate</span>
                    </div>
                    <span className="text-xl font-bold text-green-500">
                      {securityStats ? 
                        Math.round(((securityStats.total_logs - securityStats.failed_logs) / Math.max(securityStats.total_logs, 1)) * 100) 
                        : 0}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Network Security</span>
                    </div>
                    <Badge variant={securityStats && securityStats.blocked_ips < 5 ? "default" : "destructive"}>
                      {securityStats && securityStats.blocked_ips < 5 ? "Secure" : "At Risk"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* IP Management */}
        <TabsContent value="ip-management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                IP Address Management
              </CardTitle>
              <CardDescription>
                Block malicious IPs and manage reputation scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ip-address">IP Address</Label>
                    <Input
                      id="ip-address"
                      placeholder="192.168.1.1"
                      value={ipBlockForm.ip_address}
                      onChange={(e) => setIpBlockForm(prev => ({ ...prev, ip_address: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="score-delta">Score Change</Label>
                    <Input
                      id="score-delta"
                      type="number"
                      placeholder="-50"
                      value={ipBlockForm.score_delta}
                      onChange={(e) => setIpBlockForm(prev => ({ ...prev, score_delta: parseInt(e.target.value) }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="block-reason">Block Reason</Label>
                    <Input
                      id="block-reason"
                      placeholder="Suspicious activity detected"
                      value={ipBlockForm.block_reason}
                      onChange={(e) => setIpBlockForm(prev => ({ ...prev, block_reason: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleIPBlock} disabled={securityLoading}>
                      {securityLoading ? 'Blocking...' : 'Block IP'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => checkIPStatus(ipBlockForm.ip_address)}
                      disabled={securityLoading}
                    >
                      Check Status
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">IP Reputation Scoring</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Score 80-100:</span>
                      <Badge variant="default">Trusted</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Score 50-79:</span>
                      <Badge variant="secondary">Monitored</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Score 20-49:</span>
                      <Badge variant="destructive">Suspicious</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Score 0-19:</span>
                      <Badge variant="destructive">Blocked</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Audit */}
        <TabsContent value="audit-logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Security Audit Trail
                  </CardTitle>
                  <CardDescription>
                    Comprehensive log of all security events and user actions
                  </CardDescription>
                </div>
                <Button onClick={loadSecurityData} disabled={loading}>
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
                            variant={log.success ? "default" : "destructive"}
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
                              Event Details
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

        {/* Threat Intelligence */}
        <TabsContent value="threat-intel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Threat Intelligence Dashboard
              </CardTitle>
              <CardDescription>
                Advanced threat detection and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Threat Intelligence</h3>
                <p>Real-time threat analysis, behavioral detection, and predictive security alerts.</p>
                <p className="text-sm mt-2">This feature will include ML-based anomaly detection and threat pattern recognition.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control */}
        <TabsContent value="access-control" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Access Control Management
              </CardTitle>
              <CardDescription>
                Role-based access control and user permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Access Control</h3>
                <p>Manage user roles, permissions, and access policies.</p>
                <p className="text-sm mt-2">Features include role assignment, permission auditing, and access policy management.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}