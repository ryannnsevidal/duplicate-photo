import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useSessionTimeout(timeoutMinutes: number = 30) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);
  const activityRef = useRef(Date.now());

  const extendSession = useCallback(() => {
    setShowWarningModal(false);
    setTimeRemaining(0);
    warningShownRef.current = false;
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
    }
    resetTimeout();
  }, []);

  const handleLogout = useCallback(() => {
    setShowWarningModal(false);
    signOut();
  }, [signOut]);

  const resetTimeout = useCallback(() => {
    // Clear all existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
    }
    
    warningShownRef.current = false;
    activityRef.current = Date.now();
    setShowWarningModal(false);
    setTimeRemaining(0);

    if (!user) return;

    // Show warning modal at 5 minutes before timeout
    const warningTime = (timeoutMinutes - 5) * 60 * 1000;
    if (warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        if (user && !warningShownRef.current && Date.now() - activityRef.current >= warningTime) {
          warningShownRef.current = true;
          setShowWarningModal(true);
          setTimeRemaining(300); // 5 minutes in seconds
          
          // Start countdown
          const startCountdown = () => {
            let remaining = 300;
            const countdown = setInterval(() => {
              remaining -= 1;
              setTimeRemaining(remaining);
              
              if (remaining <= 0) {
                clearInterval(countdown);
                setShowWarningModal(false);
                handleLogout();
              }
            }, 1000);
            
            countdownRef.current = countdown as any;
          };
          
          startCountdown();
        }
      }, warningTime);
    }

    // Set main timeout
    timeoutRef.current = setTimeout(() => {
      if (user && Date.now() - activityRef.current >= timeoutMinutes * 60 * 1000) {
        console.warn('⏰ Auto logout due to inactivity');
        toast({
          title: "Session Expired",
          description: "You have been automatically logged out due to inactivity.",
          variant: "destructive",
        });
        signOut();
      }
    }, timeoutMinutes * 60 * 1000);
  }, [user, timeoutMinutes, toast, signOut, handleLogout]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Don't reset timeout during OAuth flows (when popups are open)
    const resetTimer = () => {
      // Check if OAuth popup is open (basic detection)
      const isOAuthInProgress = document.body.hasAttribute('data-oauth-popup') ||
                                window.location.search.includes('code=') ||
                                window.location.search.includes('oauth') ||
                                document.title.includes('Google') ||
                                document.title.includes('Dropbox');
      
      if (!isOAuthInProgress) {
        activityRef.current = Date.now();
        resetTimeout();
      }
    };
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Initial timeout setup
    resetTimeout();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, resetTimeout]);

  return { 
    resetTimeout, 
    showWarningModal, 
    timeRemaining, 
    extendSession, 
    handleLogout 
  };
}