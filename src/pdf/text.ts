import pdfParse from 'pdf-parse';
import { shingles, simhash64 } from '../lib/simhash';

export interface PdfTextResult {
	pages: number;
	text: string;
	hasText: boolean;
	simhashDoc: bigint | null;
}

export async function extractTextAndSimhash(buffer: Buffer, k = Number(process.env.SIMHASH_K || '5')): Promise<PdfTextResult> {
	const data = await pdfParse(buffer);
	const pages = (data as any).numpages ?? 0;
	const text = data.text || '';
	const hasText = text.trim().length > 0;
	const features = hasText ? shingles(text, k) : new Map<string, number>();
	const simhashDoc = hasText ? simhash64(features) : null;
	return { pages, text, hasText, simhashDoc };
}