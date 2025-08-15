import crypto from 'node:crypto';
import sharp from 'sharp';

export async function sha256File(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash('sha256');
		const stream = sharp(filePath).toBuffer({ resolveWithObject: true });
		stream
			.then(({ data }) => {
				hash.update(data);
				resolve(hash.digest('hex'));
			})
			.catch(reject);
	});
}

export async function phash64(filePath: string): Promise<bigint> {
	const image = sharp(filePath).grayscale().resize(32, 32, { fit: 'fill' });
	const { data } = await image.raw().toBuffer({ resolveWithObject: true });
	const floats = new Float64Array(32 * 32);
	for (let i = 0; i < data.length; i++) floats[i] = data[i] / 255;
	const dct = dct2d(floats, 32);
	const bits = blockToBits(dct, 32);
	return bits;
}

function dct2d(src: Float64Array, n: number): Float64Array {
	const dst = new Float64Array(n * n);
	const tmp = new Float64Array(n * n);
	const cos: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
	for (let u = 0; u < n; u++) {
		for (let x = 0; x < n; x++) {
			cos[u][x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * n));
		}
	}
	// rows
	for (let y = 0; y < n; y++) {
		for (let u = 0; u < n; u++) {
			let sum = 0;
			for (let x = 0; x < n; x++) sum += src[y * n + x] * cos[u][x];
			tmp[y * n + u] = sum;
		}
	}
	// cols
	for (let u = 0; u < n; u++) {
		for (let v = 0; v < n; v++) {
			let sum = 0;
			for (let y = 0; y < n; y++) sum += tmp[y * n + u] * cos[v][y];
			dst[v * n + u] = sum;
		}
	}
	return dst;
}

function blockToBits(dct: Float64Array, n: number): bigint {
	const block: number[] = [];
	for (let y = 0; y < 8; y++) {
		for (let x = 0; x < 8; x++) {
			block.push(dct[y * n + x]);
		}
	}
	const values = block.slice(1); // drop DC
	const sorted = [...values].sort((a, b) => a - b);
	const median = sorted[Math.floor(sorted.length / 2)];
	let bits = 0n;
	for (let i = 0; i < 64; i++) {
		if (i === 0) continue; // skip DC position
		if (values[i - 1] > median) bits |= 1n << BigInt(63 - i);
	}
	return bits;
}

export function hamming64(a: bigint, b: bigint): number {
	let x = a ^ b;
	let c = 0;
	while (x) {
		x &= x - 1n;
		c++;
	}
	return c;
}