import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Monitor, MapPin, Clock, Shield, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActiveSession {
  id: string;
  user_id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  city: string;
  country_code: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
  expires_at: string;
}

export function AdminSessionManager() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      
      // Fetch active sessions with user email from auth.users
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          id,
          user_id,
          ip_address,
          user_agent,
          city,
          country_code,
          created_at,
          last_activity,
          is_active,
          expires_at
        `)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      // Get user emails separately using the user IDs
      const userIds = data?.map(session => session.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      // Map sessions with user emails
      const sessionsWithEmail: ActiveSession[] = data?.map(session => ({
        ...session,
        ip_address: String(session.ip_address || '0.0.0.0'),
        user_email: profiles?.find(p => p.user_id === session.user_id)?.email || 'Unknown'
      })) || [];

      setSessions(sessionsWithEmail);
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
      toast({
        title: "Failed to Load Sessions",
        description: error.message || "Could not fetch active sessions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string, userEmail: string) => {
    try {
      setTerminating(sessionId);
      
      // Call edge function to terminate session
      const { error } = await supabase.functions.invoke('enhanced-security-manager', {
        body: {
          action: 'terminate_session',
          session_id: sessionId
        }
      });

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      toast({
        title: "Session Terminated",
        description: `Successfully terminated session for ${userEmail}`,
      });

    } catch (error: any) {
      console.error('Failed to terminate session:', error);
      toast({
        title: "Failed to Terminate Session",
        description: error.message || "Could not terminate the session.",
        variant: "destructive",
      });
    } finally {
      setTerminating(null);
    }
  };

  const getBrowserInfo = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return { name: 'Chrome', icon: '🌐' };
    if (userAgent.includes('Firefox')) return { name: 'Firefox', icon: '🦊' };
    if (userAgent.includes('Safari')) return { name: 'Safari', icon: '🧭' };
    if (userAgent.includes('Edge')) return { name: 'Edge', icon: '📘' };
    return { name: 'Unknown', icon: '❓' };
  };

  const getSessionStatus = (session: ActiveSession) => {
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const lastActivity = new Date(session.last_activity);
    const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

    if (expiresAt < now) return { status: 'expired', color: 'destructive' };
    if (minutesSinceActivity > 30) return { status: 'idle', color: 'secondary' };
    if (minutesSinceActivity > 10) return { status: 'inactive', color: 'outline' };
    return { status: 'active', color: 'default' };
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Sessions
            <Badge variant="secondary">{sessions.length}</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActiveSessions}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active sessions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const browser = getBrowserInfo(session.user_agent);
                  const sessionStatus = getSessionStatus(session);
                  
                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.user_email}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.ip_address}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {session.city ? `${session.city}, ${session.country_code}` : session.country_code || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{browser.icon}</span>
                          <div>
                            <div className="text-sm font-medium">{browser.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {session.user_agent.split(' ')[0]}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sessionStatus.color as any}>
                          {sessionStatus.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
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
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Terminate Session</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to terminate the session for {session.user_email}? 
                                They will be signed out immediately and need to log in again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => terminateSession(session.id, session.user_email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Terminate Session
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}