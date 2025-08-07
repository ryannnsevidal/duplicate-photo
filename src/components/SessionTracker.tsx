import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SessionTrackerProps {
  user: User | null;
  onLogout: () => void;
  sessionTimeout?: number; // in seconds
  activityCheckInterval?: number; // in milliseconds
  warningThreshold?: number; // seconds before timeout to show warning
}

export const SessionTracker: React.FC<SessionTrackerProps> = ({
  user,
  onLogout,
  sessionTimeout = 1800, // 30 minutes default
  activityCheckInterval = 60000, // 1 minute default
  warningThreshold = 300, // 5 minutes default
}) => {
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(sessionTimeout);
  const [isActive, setIsActive] = useState(true);

  // Track user activity
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    setIsActive(true);
    setShowWarning(false);

    // Log activity to Supabase
    if (user) {
      supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          last_activity: new Date().toISOString(),
          session_id: user.id + '_' + Date.now(),
          is_active: true,
        })
        .catch(error => {
          console.error('Failed to update session activity:', error);
        });
    }
  }, [user]);

  // Handle session timeout
  const handleTimeout = useCallback(() => {
    toast.error('Session expired due to inactivity');
    setShowWarning(false);
    onLogout();
  }, [onLogout]);

  // Extend session
  const extendSession = useCallback(() => {
    updateActivity();
    toast.success('Session extended');
  }, [updateActivity]);

  // Activity event listeners
  useEffect(() => {
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  // Session monitoring interval
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Check if OAuth popup is active - pause session timeout during OAuth flows
      const isOAuthActive = document.body.hasAttribute('data-oauth-popup');
      
      if (isOAuthActive) {
        console.log('🔐 OAuth popup active - session timeout paused');
        return; // Skip timeout check during OAuth
      }
      
      const now = Date.now();
      const timeSinceActivity = Math.floor((now - lastActivity) / 1000);
      const remaining = sessionTimeout - timeSinceActivity;

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        handleTimeout();
      } else if (remaining <= warningThreshold && !showWarning) {
        setShowWarning(true);
        setIsActive(false);
        toast.warning(`Session will expire in ${Math.floor(remaining / 60)} minutes`);
      }
    }, activityCheckInterval);

    return () => clearInterval(interval);
  }, [user, lastActivity, sessionTimeout, warningThreshold, activityCheckInterval, showWarning, handleTimeout]);

  // Initialize session on user login
  useEffect(() => {
    if (user) {
      updateActivity();
    }
  }, [user, updateActivity]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) return null;

  return (
    <>
      {/* Session Status Indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-card border rounded-lg p-3 shadow-lg text-xs">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              <span>Session: {formatTimeRemaining(timeRemaining)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Session Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <DialogTitle>Session Expiring Soon</DialogTitle>
            </div>
            <DialogDescription>
              Your session will expire in{' '}
              <span className="font-semibold text-red-600">
                {formatTimeRemaining(timeRemaining)}
              </span>{' '}
              due to inactivity.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm text-yellow-700">
                    Click "Stay Logged In" to extend your session, or you will be
                    automatically logged out for security.
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-countdown display */}
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-red-600">
                {formatTimeRemaining(timeRemaining)}
              </div>
              <p className="text-sm text-muted-foreground">
                Time remaining
              </p>
            </div>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleTimeout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout Now</span>
            </Button>
            <Button
              onClick={extendSession}
              className="flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>Stay Logged In</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SessionTracker;
