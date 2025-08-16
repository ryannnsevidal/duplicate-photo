export function toAbsoluteUrl(input: string, base?: string): string {
	if (!input) throw new Error('toAbsoluteUrl: empty input');
	if (/^https?:\/\//i.test(input)) return input;
	const b = base || (typeof window !== 'undefined' ? (window as any).location?.origin || 'http://localhost:3000' : 'http://localhost:3000');
	const left = String(b).replace(/\/+$/, '');
	const right = String(input).replace(/^\/+/, '');
	return `${left}/${right}`;
}

export function tryNewURL(input: string, base?: string): URL | null {
	try {
		if (!/^https?:\/\//i.test(input)) return new URL(input, base || (typeof window !== 'undefined' ? (window as any).location?.origin || 'http://localhost:3000' : 'http://localhost:3000'));
		return new URL(input);
	} catch {
		return null;
	}
}