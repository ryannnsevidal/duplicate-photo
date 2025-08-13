import React from 'react';
import { requireAuth } from '../../e2e/session';

export default function E2EAdminSessions() {
  const session = requireAuth();
  if (session.role !== 'admin') {
    window.location.assign('/signin');
    return null;
  }
  return (
    <div style={{maxWidth: 860, margin: '48px auto', padding: 24}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16}}>
        <h2>Admin Sessions</h2>
        <span data-testid="admin-badge" style={{background:'#16a34a', color:'#fff', padding:'2px 8px', borderRadius: 999}}>
          Administrator
        </span>
      </div>
      <section data-testid="sessions-panel" style={{border:'1px solid #eee', borderRadius:8, padding:16, marginBottom:16}}>
        <h3>Active Sessions</h3>
        <ul><li>user1@example.com</li><li>user2@example.com</li></ul>
      </section>
      <section data-testid="uploads-panel" style={{border:'1px solid #eee', borderRadius:8, padding:16, marginBottom:16}}>
        <h3>Recent Uploads</h3>
        <ul><li>IMG_0001.png</li><li>IMG_0002.jpg</li></ul>
      </section>
      <section data-testid="security-log-panel" style={{border:'1px solid #eee', borderRadius:8, padding:16}}>
        <h3>Security Log</h3>
        <ul><li>Policy updated</li><li>User revoked</li></ul>
      </section>
    </div>
  );
}
