import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Upload, Shield, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface UserSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_activity: string;
  is_active: boolean;
}

interface FileUpload {
  id: string;
  user_id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
}

interface SecurityLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  success: boolean;
  created_at: string;
  ip_address: string | null;
}

export function AdminPage() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const redirected = useRef(false);

  // Check admin status
  useEffect(() => {
    if (!user) return;

    const checkAdminStatus = async () => {
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        const hasAdminRole = !!data?.role;
        setIsAdmin(hasAdminRole);

        if (!hasAdminRole && !redirected.current) {
          redirected.current = true;
          toast({
            title: "Not Authorized",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        if (!redirected.current) {
          redirected.current = true;
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, navigate, toast]);

  // Fetch admin data
  useEffect(() => {
    if (!isAdmin) return;

    const fetchAdminData = async () => {
      try {
        // Fetch active sessions
        const { data: sessionsData } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('is_active', true)
          .order('last_activity', { ascending: false })
          .limit(10);

        // Fetch recent uploads
        const { data: uploadsData } = await supabase
          .from('file_upload_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch security logs
        const { data: logsData } = await supabase
          .from('security_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        setSessions((sessionsData || []) as UserSession[]);
        setUploads((uploadsData || []) as FileUpload[]);
        setSecurityLogs((logsData || []) as SecurityLog[]);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast({
          title: "Error",
          description: "Failed to load admin data",
          variant: "destructive",
        });
      }
    };

    fetchAdminData();
  }, [isAdmin, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Administrator
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>Currently active user sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="admin-sessions">
              {sessions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active sessions</p>
              ) : (
                sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">User {session.user_id.substring(0, 8)}...</p>
                      <p className="text-muted-foreground">{session.ip_address || 'Unknown IP'}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={session.is_active ? "default" : "secondary"}>
                        {session.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
            <CardDescription>Latest file uploads across all users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="admin-uploads">
              {uploads.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent uploads</p>
              ) : (
                uploads.slice(0, 5).map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{upload.original_filename}</p>
                      <p className="text-muted-foreground">
                        {formatFileSize(upload.file_size_bytes)} • {upload.file_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Log
            </CardTitle>
            <CardDescription>Recent security events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="admin-security-log">
              {securityLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent security events</p>
              ) : (
                securityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.action}</p>
                      <p className="text-muted-foreground truncate">{log.resource}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={log.success ? "default" : "destructive"}>
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="h-6 w-6" />
              Manage Users
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Shield className="h-6 w-6" />
              Security Settings
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Upload className="h-6 w-6" />
              File Management
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Clock className="h-6 w-6" />
              System Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}