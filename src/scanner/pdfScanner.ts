import path from 'node:path';
import { stat } from 'node:fs/promises';
import { hashPdfAtPath } from '../pdf/hash';

let renderModule: any = null;
try {
	renderModule = await import('../pdf/render');
} catch {}

export interface ScannedPdfRecord {
	path: string;
	size: number;
	sha256: string; // raw
	sha256_canonical: string | null;
	file_type: 'pdf';
	pdf_pages: number | null;
	pdf_has_text: boolean | null;
	pdf_simhash: bigint | null;
	pages: Array<{ page_index: number; phash: bigint; width: number; height: number }>; // sampled
}

export async function scanSinglePdf(filePath: string): Promise<ScannedPdfRecord | null> {
	if (!isPdf(filePath)) return null;
	const st = await stat(filePath);
	const f = await hashPdfAtPath(filePath);
	const pages: Array<{ page_index: number; phash: bigint; width: number; height: number }> = [];
	if (renderModule) {
		const { renderSampledPages } = renderModule as typeof import('../pdf/render');
		const renders = await renderSampledPages(filePath);
		const { phash64FromBuffer } = await import('../lib/hash');
		for (const r of renders) {
			const ph = await phash64FromBuffer(r.buffer);
			pages.push({ page_index: r.pageIndex, phash: ph, width: r.width, height: r.height });
		}
	}
	return {
		path: path.posix.normalize(filePath),
		size: st.size,
		sha256: f.sha256_raw,
		sha256_canonical: f.sha256_canonical,
		file_type: 'pdf',
		pdf_pages: f.pdf_pages,
		pdf_has_text: f.pdf_has_text,
		pdf_simhash: f.pdf_simhash,
		pages,
	};
}

function isPdf(p: string): boolean {
	const lower = p.toLowerCase();
	return lower.endsWith('.pdf');
}