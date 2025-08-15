import { Client } from 'pg';

export interface UpsertImageInput {
	path: string;
	size: number;
	sha256: string;
	sha256_canonical?: string | null;
	file_type?: string | null;
	width?: number | null;
	height?: number | null;
	exif_dt?: Date | null;
	phash?: bigint | null;
	status?: string | null;
	pdf_pages?: number | null;
	pdf_has_text?: boolean | null;
	pdf_simhash?: bigint | null;
}

export async function upsertImage(client: Client, input: UpsertImageInput): Promise<number> {
	const res = await client.query(
		`
		INSERT INTO images (path, size, sha256, sha256_canonical, file_type, width, height, exif_dt, phash, status, pdf_pages, pdf_has_text, pdf_simhash)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		ON CONFLICT (path) DO UPDATE SET
			size = EXCLUDED.size,
			sha256 = EXCLUDED.sha256,
			sha256_canonical = EXCLUDED.sha256_canonical,
			file_type = EXCLUDED.file_type,
			width = EXCLUDED.width,
			height = EXCLUDED.height,
			exif_dt = EXCLUDED.exif_dt,
			phash = EXCLUDED.phash,
			status = EXCLUDED.status,
			pdf_pages = EXCLUDED.pdf_pages,
			pdf_has_text = EXCLUDED.pdf_has_text,
			pdf_simhash = EXCLUDED.pdf_simhash,
			scanned_at = now()
		RETURNING id
		`,
		[
			input.path,
			input.size,
			input.sha256,
			input.sha256_canonical ?? null,
			input.file_type ?? null,
			input.width ?? null,
			input.height ?? null,
			input.exif_dt ?? null,
			input.phash ?? null,
			input.status ?? 'OK',
			input.pdf_pages ?? null,
			input.pdf_has_text ?? null,
			input.pdf_simhash ?? null,
		],
	);
	return res.rows[0].id as number;
}