import React from 'react';
import { AppRouter } from '@/components/AppRouter';
import { SessionWarningModal } from '@/components/SessionWarningModal';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/hooks/useAuth';

export function AppWithSessionModal() {
  const { user } = useAuth();
  const { showWarningModal, timeRemaining, extendSession, handleLogout } = useSessionTimeout(30);

  return (
    <>
      <AppRouter />
      {user && (
        <SessionWarningModal
          isOpen={showWarningModal}
          onClose={() => {}}
          onExtendSession={extendSession}
          onLogout={handleLogout}
          timeRemaining={timeRemaining}
        />
      )}
    </>
  );
}