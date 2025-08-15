import fs from 'node:fs/promises';
import { createCanvas } from 'canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';

export interface PageRenderResult {
	pageIndex: number;
	buffer: Buffer;
	width: number;
	height: number;
}

export interface RenderOptions {
	dpi: number;
	start: number;
	step: number;
	limit: number;
}

function parseSample(sample: string): { start: number; step: number; limit: number } {
	const [a, b, c] = sample.split(':').map((x) => parseInt(x, 10));
	return { start: isFinite(a) && a > 0 ? a : 1, step: isFinite(b) && b > 0 ? b : 1, limit: isFinite(c) && c > 0 ? c : 50 };
}

export async function renderSampledPages(pdfPath: string, opts?: Partial<RenderOptions>): Promise<PageRenderResult[]> {
	const data = new Uint8Array(await fs.readFile(pdfPath));
	const loadingTask = (pdfjs as any).getDocument({ data });
	const pdf = await loadingTask.promise;
	const total = pdf.numPages as number;
	const parsed = parseSample(process.env.PDF_SAMPLE || '1:1:50');
	const start = opts?.start ?? parsed.start;
	const step = opts?.step ?? parsed.step;
	const limit = opts?.limit ?? parsed.limit;
	const dpi = opts?.dpi ?? Number(process.env.PDF_RASTER_DPI || '110');
	const scale = dpi / 72; // PDF points to pixels

	const results: PageRenderResult[] = [];
	let count = 0;
	for (let pageNum = start; pageNum <= total && count < limit; pageNum += step) {
		const page = await pdf.getPage(pageNum);
		const viewport = page.getViewport({ scale });
		const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
		const ctx = canvas.getContext('2d');
		await page.render({ canvasContext: ctx as any, viewport }).promise;
		const buffer = canvas.toBuffer('image/png');
		results.push({ pageIndex: pageNum - 1, buffer, width: canvas.width, height: canvas.height });
		count++;
	}
	return results;
}