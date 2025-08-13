import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Monitor, 
  Globe, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  X,
  Smartphone,
  MapPin
} from 'lucide-react';
import { useAdvancedSessionSecurity } from '@/hooks/useAdvancedSessionSecurity';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

interface SessionSecurityDashboardProps {
  className?: string;
}

export function SessionSecurityDashboard({ className }: SessionSecurityDashboardProps) {
  const { user } = useAuth();
  const {
    sessionSecurity,
    activeSessions,
    loading,
    initializeSessionSecurity,
    getActiveSessions,
    terminateSession,
    terminateAllOtherSessions,
    validateSessionIntegrity
  } = useAdvancedSessionSecurity();

  useEffect(() => {
    if (user && !sessionSecurity) {
      initializeSessionSecurity(user.id);
    }
  }, [user, sessionSecurity, initializeSessionSecurity]);

  useEffect(() => {
    if (user) {
      getActiveSessions();
    }
  }, [user, getActiveSessions]);

  const formatDeviceInfo = (userAgent: string): { device: string; browser: string } => {
    const device = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'Mobile' : 'Desktop';
    let browser = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    return { device, browser };
  };

  const getSecurityLevelColor = (isActive: boolean, isCurrentSession: boolean) => {
    if (isCurrentSession) return 'bg-green-100 text-green-800';
    if (isActive) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleValidateIntegrity = async () => {
    const isValid = await validateSessionIntegrity();
    if (isValid) {
      // Show success message
    }
  };

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please sign in to view session security information.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Session Security Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Session Security
          </CardTitle>
          <CardDescription>
            Your current session security status and fingerprint information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionSecurity ? (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Session Secured</span>
                <Badge variant="outline" className="bg-green-50">
                  Verified
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Device:</strong> {sessionSecurity.deviceInfo}
                </div>
                <div>
                  <strong>IP Address:</strong> {sessionSecurity.ipAddress || 'Unknown'}
                </div>
                <div>
                  <strong>Screen:</strong> {sessionSecurity.fingerprint.screen}
                </div>
                <div>
                  <strong>Timezone:</strong> {sessionSecurity.fingerprint.timezone}
                </div>
              </div>

              <Button 
                onClick={handleValidateIntegrity}
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <Shield className="h-4 w-4 mr-2" />
                Validate Session Integrity
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-600">Session security not initialized</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            All active sessions for your account. Terminate suspicious sessions immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading sessions...</div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No active sessions found
            </div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => {
                const { device, browser } = formatDeviceInfo(session.user_agent || '');
                const isCurrentSession = session.session_token === sessionSecurity?.sessionToken;
                
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {device === 'Mobile' ? (
                        <Smartphone className="h-5 w-5 text-gray-500" />
                      ) : (
                        <Monitor className="h-5 w-5 text-gray-500" />
                      )}
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{browser} on {device}</span>
                          {isCurrentSession && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Current Session
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          {session.ip_address && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {session.ip_address}
                            </span>
                          )}
                          
                          {session.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.city}
                            </span>
                          )}
                          
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={getSecurityLevelColor(session.is_active, isCurrentSession)}
                      >
                        {isCurrentSession ? 'Current' : session.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      
                      {!isCurrentSession && session.is_active && (
                        <Button
                          onClick={() => terminateSession(session.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                          Terminate
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {activeSessions.filter(s => s.is_active).length > 1 && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={terminateAllOtherSessions}
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Terminate All Other Sessions
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Regularly review and terminate unrecognized sessions</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Use unique passwords and enable two-factor authentication</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Avoid using public computers for sensitive operations</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Log out from shared devices and public networks</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}