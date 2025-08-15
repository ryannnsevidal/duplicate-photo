import crypto from 'node:crypto';

export interface MemberIdentity { sha256_canonical?: string | null; sha256?: string; size: number; path: string }

export function contentIdentity(i: MemberIdentity): string {
	return i.sha256_canonical ?? i.sha256 ?? `${i.size}:${crypto.createHash('sha1').update(i.path).digest('hex')}`;
}

export function stableGroupKey(memberIdentities: string[]): string {
	const sorted = [...memberIdentities].sort();
	const material = sorted.join('|');
	return crypto.createHash('sha1').update(material).digest('hex');
}

export type Candidate = {
	id: number;
	pageCount?: number;
	hasText?: boolean;
	avgPagePixels?: number;
	exifDt?: Date | null;
	path: string;
};

export function representativeScore(c: Candidate): number {
	const pageFactor = c.pageCount ?? 1;
	const textFactor = c.hasText ? 1 : 0;
	const resFactor = Math.log10((c.avgPagePixels ?? 1) + 1);
	const timeFactor = c.exifDt ? c.exifDt.getTime() / 1e13 : 0;
	return 3 * pageFactor + 2 * textFactor + 1.5 * resFactor + 0.25 * timeFactor;
}

export function pickRepresentative(cs: Candidate[]): Candidate {
	return cs
		.slice()
		.sort((a, b) => {
			const d = representativeScore(b) - representativeScore(a);
			if (d !== 0) return d;
			if ((b.pageCount ?? 0) !== (a.pageCount ?? 0)) return (b.pageCount ?? 0) - (a.pageCount ?? 0);
			if ((b.avgPagePixels ?? 0) !== (a.avgPagePixels ?? 0)) return (b.avgPagePixels ?? 0) - (a.avgPagePixels ?? 0);
			if ((b.hasText ? 1 : 0) !== (a.hasText ? 1 : 0)) return (b.hasText ? 1 : 0) - (a.hasText ? 1 : 0);
			if ((b.exifDt?.getTime() ?? 0) !== (a.exifDt?.getTime() ?? 0)) return (b.exifDt?.getTime() ?? 0) - (a.exifDt?.getTime() ?? 0);
			return a.path.localeCompare(b.path);
		})[0];
}