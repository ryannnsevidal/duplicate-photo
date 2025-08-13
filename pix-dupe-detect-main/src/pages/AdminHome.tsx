import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  FileText, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Database,
  Settings,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SystemStats {
  totalUsers: number;
  totalUploads: number;
  duplicatesFound: number;
  blockedIPs: number;
  failedLogins: number;
  activeUsers: number;
}

interface RecentActivity {
  id: string;
  type: 'upload' | 'login' | 'security' | 'duplicate';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export function AdminHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalUploads: 0,
    duplicatesFound: 0,
    blockedIPs: 0,
    failedLogins: 0,
    activeUsers: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        navigate('/signin');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error || !data || data.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "Admin privileges required",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Role check failed:', error);
        navigate('/');
      }
    };

    checkAdminRole();
  }, [user, navigate, toast]);

  // Load system statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!isAdmin) return;

      try {
        setLoading(true);

        // Get total users from profiles
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get total uploads
        const { count: uploadCount } = await supabase
          .from('file_upload_logs')
          .select('*', { count: 'exact', head: true });

        // Get duplicates found
        const { count: duplicateCount } = await supabase
          .from('dedup_events')
          .select('*', { count: 'exact', head: true })
          .eq('is_duplicate', true);

        // Get blocked IPs
        const { count: blockedIPCount } = await supabase
          .from('ip_reputation')
          .select('*', { count: 'exact', head: true })
          .not('blocked_until', 'is', null)
          .gte('blocked_until', new Date().toISOString());

        // Get recent failed logins (last 24 hours)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: failedLoginCount } = await supabase
          .from('security_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('action', 'auth_failed')
          .gte('created_at', yesterday);

        // Get active users (last 24 hours)
        const { count: activeUserCount } = await supabase
          .from('security_audit_log')
          .select('user_id', { count: 'exact', head: true })
          .eq('action', 'user_session_started')
          .gte('created_at', yesterday);

        setStats({
          totalUsers: userCount || 0,
          totalUploads: uploadCount || 0,
          duplicatesFound: duplicateCount || 0,
          blockedIPs: blockedIPCount || 0,
          failedLogins: failedLoginCount || 0,
          activeUsers: activeUserCount || 0
        });

        // Load recent activity
        const { data: activities } = await supabase
          .from('security_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (activities) {
          const formattedActivities: RecentActivity[] = activities.map(activity => ({
            id: activity.id,
            type: getActivityType(activity.action),
            message: formatActivityMessage(activity),
            timestamp: activity.created_at,
            severity: getActivitySeverity(activity.action, activity.success)
          }));

          setRecentActivity(formattedActivities);
        }

      } catch (error) {
        console.error('Failed to load admin stats:', error);
        toast({
          title: "Error",
          description: "Failed to load system statistics",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [isAdmin, toast]);

  const getActivityType = (action: string): RecentActivity['type'] => {
    if (action.includes('upload')) return 'upload';
    if (action.includes('auth') || action.includes('login')) return 'login';
    if (action.includes('dedup')) return 'duplicate';
    return 'security';
  };

  const getActivitySeverity = (action: string, success: boolean): RecentActivity['severity'] => {
    if (!success) return 'error';
    if (action.includes('failed') || action.includes('blocked')) return 'warning';
    if (action.includes('success') || action.includes('completed')) return 'success';
    return 'info';
  };

  const formatActivityMessage = (activity: any): string => {
    const metadata = activity.metadata || {};
    switch (activity.action) {
      case 'file_uploaded':
        return `File uploaded: ${metadata.filename || 'Unknown file'}`;
      case 'duplicate_detected':
        return `Duplicate detected: ${metadata.filename || 'Unknown file'}`;
      case 'user_session_started':
        return `User logged in: ${metadata.email || 'Unknown user'}`;
      case 'auth_failed':
        return `Failed login attempt from ${metadata.ip_address || 'Unknown IP'}`;
      default:
        return activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getSeverityIcon = (severity: RecentActivity['severity']) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system security, user activity, and file operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/panel')} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Audit Panel
          </Button>
          <Button onClick={() => navigate('/admin/enhanced')} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Enhanced Admin
          </Button>
        </div>
      </div>

      {/* System Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Uploads</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUploads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.duplicatesFound} duplicates prevented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedLogins.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.blockedIPs} IPs blocked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  {getSeverityIcon(activity.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={activity.severity === 'error' ? 'destructive' : 'secondary'}>
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Security Status
            </CardTitle>
            <CardDescription>
              Current security alerts and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.blockedIPs > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {stats.blockedIPs} IP addresses are currently blocked due to suspicious activity
                </AlertDescription>
              </Alert>
            )}
            
            {stats.failedLogins > 10 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High number of failed login attempts detected in the last 24 hours
                </AlertDescription>
              </Alert>
            )}
            
            {stats.duplicatesFound > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Duplicate detection is working properly - {stats.duplicatesFound} duplicates prevented
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/panel')}
              className="h-20 flex flex-col gap-2"
            >
              <Database className="h-6 w-6" />
              <span>View Audit Logs</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/enhanced')}
              className="h-20 flex flex-col gap-2"
            >
              <Shield className="h-6 w-6" />
              <span>Security Settings</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.open('https://supabase.com/dashboard/project/gzveopdxovjlqpawgbzq/auth/users', '_blank')}
              className="h-20 flex flex-col gap-2"
            >
              <Users className="h-6 w-6" />
              <span>Manage Users</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.open('https://supabase.com/dashboard/project/gzveopdxovjlqpawgbzq/functions', '_blank')}
              className="h-20 flex flex-col gap-2"
            >
              <Settings className="h-6 w-6" />
              <span>Edge Functions</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}