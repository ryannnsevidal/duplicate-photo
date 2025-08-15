import crypto from 'node:crypto';

export function shingles(text: string, k = 5): Map<string, number> {
	const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
	const tokens = normalized.length ? normalized.split(' ') : [];
	const map = new Map<string, number>();
	for (let i = 0; i + k <= tokens.length; i++) {
		const s = tokens.slice(i, i + k).join(' ');
		map.set(s, (map.get(s) ?? 0) + 1);
	}
	return map;
}

export function simhash64(features: Map<string, number>): bigint {
	const vector = new Array<number>(64).fill(0);
	for (const [token, weight] of features) {
		const h = murmur64(token);
		for (let i = 0; i < 64; i++) {
			const bit = (h >> BigInt(i)) & 1n;
			vector[i] += bit === 1n ? weight : -weight;
		}
	}
	let bits = 0n;
	for (let i = 0; i < 64; i++) if (vector[i] > 0) bits |= 1n << BigInt(i);
	return bits;
}

function murmur64(input: string): bigint {
	// Use SHA-256 as a stable 64-bit source by truncating; good enough for SimHash token hashing
	const hash = crypto.createHash('sha256').update(input).digest();
	// Take first 8 bytes little-endian
	let result = 0n;
	for (let i = 0; i < 8; i++) {
		result |= BigInt(hash[i]) << BigInt(i * 8);
	}
	return result;
}