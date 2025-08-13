import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtendSession: () => void;
  onLogout: () => void;
  timeRemaining: number;
}

export function SessionWarningModal({
  isOpen,
  onClose,
  onExtendSession,
  onLogout,
  timeRemaining
}: SessionWarningModalProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-destructive" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in{' '}
            <span className="font-semibold text-destructive">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>{' '}
            due to inactivity. Would you like to extend your session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout}>
            Logout Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={onExtendSession}>
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}