import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { canonicalizePdf, cleanupCanonical } from './canonicalize';
import { extractTextAndSimhash } from './text';

export interface PdfHashOptions {
	maxBytes: number;
	maxPages: number;
}

export interface PdfFingerprint {
	sha256_raw: string;
	sha256_canonical: string | null;
	pdf_pages: number | null;
	pdf_has_text: boolean | null;
	pdf_simhash: bigint | null;
}

export async function hashPdfAtPath(filePath: string, opts?: Partial<PdfHashOptions>): Promise<PdfFingerprint> {
	const maxBytes = opts?.maxBytes ?? Number(process.env.PDF_MAX_BYTES || '104857600');
	const maxPages = opts?.maxPages ?? Number(process.env.PDF_MAX_PAGES || '200');

	const st = await stat(filePath);
	if (st.size > maxBytes) {
		return {
			sha256_raw: await sha256FilePath(filePath),
			sha256_canonical: null,
			pdf_pages: null,
			pdf_has_text: null,
			pdf_simhash: null,
		};
	}

	const buffer = await readFile(filePath);
	const sha256_raw = sha256Buffer(buffer);

	let sha256_canonical: string | null = null;
	const canonPath = await canonicalizePdf(filePath);
	try {
		if (canonPath) {
			const canonBuf = await readFile(canonPath);
			sha256_canonical = sha256Buffer(canonBuf);
		}
	} finally {
		await cleanupCanonical(canonPath);
	}

	let pages: number | null = null;
	let hasText: boolean | null = null;
	let simhashDoc: bigint | null = null;
	try {
		const textRes = await extractTextAndSimhash(buffer);
		pages = Math.min(textRes.pages, maxPages);
		hasText = textRes.hasText;
		simhashDoc = textRes.simhashDoc;
	} catch {
		// keep nulls
	}

	return {
		sha256_raw,
		sha256_canonical,
		pdf_pages: pages,
		pdf_has_text: hasText,
		pdf_simhash: simhashDoc,
	};
}

function sha256Buffer(buf: Buffer): string {
	return createHash('sha256').update(buf).digest('hex');
}

async function sha256FilePath(filePath: string): Promise<string> {
	const buf = await readFile(filePath);
	return sha256Buffer(buf);
}