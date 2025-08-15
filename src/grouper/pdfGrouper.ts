import { Client } from 'pg';
import { visualDistanceSliding } from './visual';
import { partialOverlapScore } from './partial';
import { contentIdentity, stableGroupKey } from './util';

function hamming64(a: bigint, b: bigint): number {
	let x = a ^ b;
	let c = 0;
	while (x) { x &= x - 1n; c++; }
	return c;
}

export async function groupPdfs(client: Client, textThreshold = Number(process.env.SIMHASH_TEXT_THRESHOLD || '6'), visualThreshold = Number(process.env.SIMILARITY_THRESHOLD_PDF || '8'), partialThreshold = Number(process.env.PDF_PARTIAL_THRESHOLD || '0.7')): Promise<void> {
	// Preload all pdf images basic info
	const imgs = await client.query(`SELECT id, path, size, sha256, sha256_canonical, pdf_pages, pdf_has_text FROM images WHERE file_type='pdf'`);
	const byId = new Map<number, any>();
	imgs.rows.forEach((r) => byId.set(r.id, r));

	// CANONICAL
	const canon = await client.query(`SELECT sha256_canonical, array_agg(id) ids FROM images WHERE file_type='pdf' AND sha256_canonical IS NOT NULL GROUP BY sha256_canonical HAVING count(*)>1`);
	for (const row of canon.rows) {
		await upsertGroup(client, row.ids as number[], 0, 'CANONICAL', {});
	}
	// TEXT NEAR
	const { rows: sims } = await client.query(`SELECT id, pdf_simhash FROM images WHERE file_type='pdf' AND pdf_simhash IS NOT NULL`);
	for (let i = 0; i < sims.length; i++) {
		for (let j = i + 1; j < sims.length; j++) {
			const a = BigInt(sims[i].pdf_simhash);
			const b = BigInt(sims[j].pdf_simhash);
			const d = hamming64(a, b);
			if (d <= textThreshold) await upsertGroup(client, [sims[i].id, sims[j].id], d, 'PDF_TEXT', { text: d });
		}
	}
	// VISUAL + PARTIAL
	const idsRes = await client.query(`SELECT DISTINCT image_id FROM pdf_page_fingerprints`);
	const ids: number[] = idsRes.rows.map((r) => r.image_id);
	const pagesById = new Map<number, bigint[]>();
	for (const id of ids) {
		const { rows } = await client.query(`SELECT page_index, phash FROM pdf_page_fingerprints WHERE image_id=$1 ORDER BY page_index`, [id]);
		pagesById.set(id, rows.map((r) => BigInt(r.phash)));
	}
	for (let i = 0; i < ids.length; i++) {
		for (let j = i + 1; j < ids.length; j++) {
			const aPages = pagesById.get(ids[i]) || [];
			const bPages = pagesById.get(ids[j]) || [];
			if (!aPages.length || !bPages.length) continue;
			const vis = visualDistanceSliding({ id: ids[i], pages: aPages }, { id: ids[j], pages: bPages });
			if (vis.median <= visualThreshold) {
				await upsertGroup(client, [ids[i], ids[j]], vis.median, 'PDF_VISUAL', { visual: vis.median, align: vis.align });
				continue;
			}
			const p = partialOverlapScore(aPages, bPages);
			if (p.jaccard >= partialThreshold) {
				await upsertGroup(client, [ids[i], ids[j]], Math.round((1 - p.jaccard) * 16), 'PDF_PARTIAL', { jaccard: p.jaccard, relation: p.relation });
			}
		}
	}

	async function upsertGroup(client: Client, memberIds: number[], distance: number, reason: string, extra: Record<string, unknown>): Promise<void> {
		const identities = memberIds.map((id) => contentIdentity(byId.get(id)));
		const groupKey = stableGroupKey(identities);
		const rep = memberIds[0];
		const g = await client.query(`INSERT INTO dupe_groups (group_key, representative_image_id) VALUES ($1,$2)
			ON CONFLICT (group_key) DO UPDATE SET representative_image_id=EXCLUDED.representative_image_id RETURNING id`, [groupKey, rep]);
		const groupId = g.rows[0].id as number;
		for (const id of memberIds) {
			await client.query(
				`INSERT INTO dupe_group_members (group_id, image_id, distance, reason, extra) VALUES ($1,$2,$3,$4,$5)
				ON CONFLICT (group_id, image_id) DO UPDATE SET distance=EXCLUDED.distance, reason=EXCLUDED.reason, extra=EXCLUDED.extra`,
				[groupId, id, distance, reason, JSON.stringify(extra)],
			);
		}
	}
}