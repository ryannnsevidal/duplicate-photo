import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Monitor, Smartphone, Tablet, Globe, Clock, UserX, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ActiveSession {
  id: string;
  user_id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
  expires_at: string;
}

export function AdminSessionViewer() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchActiveSessions = async () => {
    try {
      // Use direct profile lookup instead of foreign key join
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      // Get profile data separately
      const userIds = sessions?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      const formattedSessions: ActiveSession[] = sessions?.map(session => ({
        ...session,
        ip_address: session.ip_address?.toString() || 'Unknown',
        user_email: profiles?.find(p => p.user_id === session.user_id)?.email || 'Unknown'
      })) || [];

      setSessions(formattedSessions);
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load active sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string, userEmail: string) => {
    setTerminating(sessionId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-session-terminator', {
        body: { session_id: sessionId }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to terminate session');
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({
        title: "Session Terminated",
        description: `Session for ${userEmail} has been terminated`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to terminate session",
        variant: "destructive",
      });
    } finally {
      setTerminating(null);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getBrowserInfo = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getSessionStatus = (session: ActiveSession) => {
    const now = new Date().getTime();
    const lastActivity = new Date(session.last_activity).getTime();
    const expiresAt = new Date(session.expires_at).getTime();
    const timeSinceActivity = now - lastActivity;
    
    if (now > expiresAt) {
      return { status: 'Expired', variant: 'destructive' as const };
    } else if (timeSinceActivity > 30 * 60 * 1000) { // 30 minutes
      return { status: 'Idle', variant: 'secondary' as const };
    } else if (timeSinceActivity > 5 * 60 * 1000) { // 5 minutes
      return { status: 'Inactive', variant: 'outline' as const };
    }
    return { status: 'Active', variant: 'default' as const };
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Monitor and manage active user sessions
          </CardDescription>
        </div>
        <Button onClick={fetchActiveSessions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active sessions found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const { status, variant } = getSessionStatus(session);
                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{session.user_email}</div>
                          <div className="text-sm text-muted-foreground">
                            {session.ip_address}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(session.user_agent)}
                        <div>
                          <div className="font-medium">{getBrowserInfo(session.user_agent)}</div>
                          <div className="text-sm text-muted-foreground">
                            {session.user_agent.includes('Mobile') ? 'Mobile' : 'Desktop'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        IP: {session.ip_address}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant}>{status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm">
                            {format(new Date(session.last_activity), 'MMM d, HH:mm')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created: {format(new Date(session.created_at), 'MMM d, HH:mm')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={terminating === session.id}
                          >
                            {terminating === session.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Terminate Session</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to terminate the session for {session.user_email}? 
                              This will force them to log in again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => terminateSession(session.id, session.user_email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Terminate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}