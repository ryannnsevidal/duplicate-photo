import React, { useState } from 'react';
import { setSession } from '../../e2e/session';

export default function E2ESignIn() {
  const [mode, setMode] = useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sess = setSession(email);
    if (sess.role === 'admin') window.location.assign('/admin/sessions');
    else window.location.assign('/upload');
  }

  return (
    <div style={{maxWidth: 420, margin: '64px auto', padding: 24, border: '1px solid #eee', borderRadius: 8}}>
      <h1 data-testid="auth-title" style={{marginBottom: 16}}>Welcome</h1>
      <form onSubmit={onSubmit}>
        <div style={{display: 'grid', gap: 12}}>
          <input data-testid="email-input" type="email" placeholder="email"
            value={email} onChange={(e)=>setEmail(e.target.value)}
            style={{padding: 10, border: '1px solid #ccc', borderRadius: 6}} />
          <input data-testid="password-input" type="password" placeholder="password"
            value={password} onChange={(e)=>setPassword(e.target.value)}
            style={{padding: 10, border: '1px solid #ccc', borderRadius: 6}} />
          <button data-testid="auth-submit" type="submit" style={{padding: 10, borderRadius: 6}}>
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </form>
      <div style={{marginTop: 12}}>
        <button data-testid="toggle-auth-mode" onClick={()=> setMode(m => m === 'signin' ? 'signup' : 'signin')}
          style={{background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer'}}>
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
