import path from 'node:path';
import { stat } from 'node:fs/promises';
import { hashPdfAtPath } from '../pdf/hash';

export interface ScannedPdfRecord {
	path: string;
	size: number;
	sha256: string; // raw
	sha256_canonical: string | null;
	file_type: 'pdf';
	pdf_pages: number | null;
	pdf_has_text: boolean | null;
	pdf_simhash: bigint | null;
}

export async function scanSinglePdf(filePath: string): Promise<ScannedPdfRecord | null> {
	if (!isPdf(filePath)) return null;
	const st = await stat(filePath);
	const f = await hashPdfAtPath(filePath);
	return {
		path: path.posix.normalize(filePath),
		size: st.size,
		sha256: f.sha256_raw,
		sha256_canonical: f.sha256_canonical,
		file_type: 'pdf',
		pdf_pages: f.pdf_pages,
		pdf_has_text: f.pdf_has_text,
		pdf_simhash: f.pdf_simhash,
	};
}

function isPdf(p: string): boolean {
	const lower = p.toLowerCase();
	return lower.endsWith('.pdf');
}