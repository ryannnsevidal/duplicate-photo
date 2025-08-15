import { hamming64 } from '../lib/hash';

export type PageHash = bigint;
export interface Doc { id: number; pages: PageHash[] }

export function visualDistanceSliding(a: Doc, b: Doc, maxWindowSkew = 8): { median: number; align: { aStart: number; bStart: number; len: number } } {
	const A = a.pages, B = b.pages;
	if (!A.length || !B.length) return { median: 64, align: { aStart: 0, bStart: 0, len: 0 } };
	const swap = A.length > B.length;
	const S = swap ? B : A;
	const L = swap ? A : B;
	const lenS = S.length, lenL = L.length;
	const windowMin = Math.max(1, Math.min(lenS, lenL - Math.min(maxWindowSkew, lenL - 1)));
	const windowMax = lenS;
	let best = { median: 64, aStart: 0, bStart: 0, len: 0 };
	for (let win = windowMin; win <= windowMax; win++) {
		for (let off = 0; off + win <= lenL; off++) {
			const distances: number[] = [];
			for (let i = 0; i < win; i++) {
				const sIdx = Math.floor((i * (lenS - 1)) / Math.max(1, win - 1));
				const d = hamming64(S[sIdx], L[off + i]);
				distances.push(d);
			}
			distances.sort((x, y) => x - y);
			const med = distances[Math.floor(distances.length / 2)];
			if (med < best.median) best = { median: med, aStart: swap ? off : 0, bStart: swap ? 0 : off, len: win };
		}
	}
	return { median: best.median, align: { aStart: best.aStart, bStart: best.bStart, len: best.len } };
}