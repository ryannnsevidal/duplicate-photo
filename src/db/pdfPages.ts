import { Client } from 'pg';

export interface PdfPageRowInput {
	image_id: number;
	page_index: number;
	phash: bigint | null;
	simhash: bigint | null;
	width: number | null;
	height: number | null;
}

export async function insertPdfPageRows(client: Client, rows: PdfPageRowInput[]): Promise<void> {
	if (!rows.length) return;
	const values: any[] = [];
	const chunks: string[] = [];
	rows.forEach((r, i) => {
		const base = i * 6;
		chunks.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`);
		values.push(r.image_id, r.page_index, r.phash ?? null, r.simhash ?? null, r.width ?? null, r.height ?? null);
	});
	await client.query(
		`INSERT INTO pdf_page_fingerprints (image_id, page_index, phash, simhash, width, height) VALUES ${chunks.join(',')}
		ON CONFLICT DO NOTHING`,
		values,
	);
}