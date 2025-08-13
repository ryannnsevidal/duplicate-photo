export type Role = 'admin' | 'user';
export type E2ESession = { email: string; role: Role };

const KEY = 'e2e_session';

export function setSession(email: string): E2ESession {
  const role: Role = (email === 'rsevidal117@gmail.com' || email.toLowerCase().includes('admin'))
    ? 'admin' : 'user';
  const session = { email, role };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function getSession(): E2ESession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as E2ESession : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function requireAuth(): E2ESession {
  const s = getSession();
  if (!s) {
    window.location.assign('/signin');
    throw new Error('redirecting to /signin');
  }
  return s;
}
