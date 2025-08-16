// browser/SSR-safe public config with sane fallbacks
export function getAppOrigin(): string {
	const env: any = (import.meta as any)?.env ?? {};
	const fromEnv = env.VITE_PUBLIC_APP_ORIGIN || env.NEXT_PUBLIC_APP_ORIGIN || env.PUBLIC_APP_ORIGIN;
	if (typeof fromEnv === 'string' && /^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/+$/, '');
	if (typeof window !== 'undefined' && (window as any).location?.origin) return (window as any).location.origin;
	return 'http://localhost:3000';
}

export function getApiBase(): string {
	const env: any = (import.meta as any)?.env ?? {};
	const fromEnv = env.VITE_PUBLIC_API_BASE || env.NEXT_PUBLIC_API_BASE || env.PUBLIC_API_BASE;
	if (typeof fromEnv === 'string' && /^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/+$/, '');
	return getAppOrigin();
}