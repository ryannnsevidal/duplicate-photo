import React from 'react';
import { AdminSessionViewer } from '@/components/AdminSessionViewer';
import { SessionSecurityDashboard } from '@/components/SessionSecurityDashboard';

export function SessionsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Session Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage user sessions and security
        </p>
      </div>

      <div className="grid gap-8">
        <AdminSessionViewer />
        <SessionSecurityDashboard />
      </div>
    </div>
  );
}