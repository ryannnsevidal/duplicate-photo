import process from 'node:process';
import { withPg } from '../db/client';
import { upsertImage } from '../db/upsert';
import { scanSinglePdf } from '../scanner/pdfScanner';

function getEnv(name: string, fallback?: string): string {
	const value = process.env[name] ?? fallback;
	if (value === undefined) {
		console.warn(`Environment variable ${name} is not set`);
		return '';
	}
	return value;
}

async function main(): Promise<void> {
	console.log('[worker] starting duplicate scanner worker');
	const databaseUrl = getEnv('DATABASE_URL');
	const rootDir = getEnv('DUPE_ROOT');
	const pathToScan = process.env.SCAN_ONE_PATH; // dev helper
	console.log(JSON.stringify({ DATABASE_URL: !!databaseUrl, DUPE_ROOT: rootDir, SCAN_ONE_PATH: pathToScan }));

	if (pathToScan && pathToScan.toLowerCase().endsWith('.pdf')) {
		console.log(`[worker] scanning single PDF: ${pathToScan}`);
		const rec = await scanSinglePdf(pathToScan);
		if (rec) {
			await withPg(async (client) => {
				const id = await upsertImage(client, {
					path: rec.path,
					size: rec.size,
					sha256: rec.sha256,
					sha256_canonical: rec.sha256_canonical,
					file_type: rec.file_type,
					pdf_pages: rec.pdf_pages,
					pdf_has_text: rec.pdf_has_text ?? null,
					pdf_simhash: rec.pdf_simhash ?? null,
				});
				console.log(`[worker] upserted image id=${id}`);
				const { insertPdfPageRows } = await import('../db/pdfPages');
				await insertPdfPageRows(
					client,
					rec.pages.map((p) => ({ image_id: id, page_index: p.page_index, phash: p.phash, simhash: null, width: p.width, height: p.height })),
				);
				console.log(`[worker] inserted ${rec.pages.length} page rows`);
			});
		}
	}

	setInterval(() => {
		process.stdout.write('.');
	}, 30000);
}

main().catch((error) => {
	console.error('[worker] fatal error', error);
	process.exit(1);
});