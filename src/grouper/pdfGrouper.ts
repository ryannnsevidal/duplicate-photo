import { Client } from 'pg';

function hamming64(a: bigint, b: bigint): number {
	let x = a ^ b;
	let c = 0;
	while (x) { x &= x - 1n; c++; }
	return c;
}

export async function groupPdfs(client: Client, textThreshold = Number(process.env.SIMHASH_TEXT_THRESHOLD || '6'), visualThreshold = Number(process.env.SIMILARITY_THRESHOLD_PDF || '8')): Promise<void> {
	// Phase 1: canonical equal
	const canon = await client.query(`SELECT sha256_canonical, array_agg(id) ids FROM images WHERE file_type='pdf' AND sha256_canonical IS NOT NULL GROUP BY sha256_canonical HAVING count(*)>1`);
	for (const row of canon.rows) {
		await createGroup(client, row.ids as number[], 0, 'CANONICAL');
	}
	// Phase 2: text near (simhash)
	const { rows: sims } = await client.query(`SELECT id, pdf_simhash FROM images WHERE file_type='pdf' AND pdf_simhash IS NOT NULL`);
	for (let i = 0; i < sims.length; i++) {
		for (let j = i + 1; j < sims.length; j++) {
			const a = BigInt(sims[i].pdf_simhash);
			const b = BigInt(sims[j].pdf_simhash);
			const d = hamming64(a, b);
			if (d <= textThreshold) await createGroup(client, [sims[i].id, sims[j].id], d, 'PDF_TEXT');
		}
	}
	// Phase 3: visual near (median over aligned pages)
	const idsRes = await client.query(`SELECT id FROM images WHERE file_type='pdf'`);
	const ids: number[] = idsRes.rows.map((r) => r.id);
	for (let i = 0; i < ids.length; i++) {
		for (let j = i + 1; j < ids.length; j++) {
			const d = await visualDistance(client, ids[i], ids[j]);
			if (d !== null && d <= visualThreshold) await createGroup(client, [ids[i], ids[j]], d, 'PDF_VISUAL');
		}
	}
}

async function visualDistance(client: Client, aId: number, bId: number): Promise<number | null> {
	const { rows: a } = await client.query(`SELECT page_index, phash FROM pdf_page_fingerprints WHERE image_id=$1 ORDER BY page_index`, [aId]);
	const { rows: b } = await client.query(`SELECT page_index, phash FROM pdf_page_fingerprints WHERE image_id=$1 ORDER BY page_index`, [bId]);
	if (!a.length || !b.length) return null;
	const aPh = a.map((r) => BigInt(r.phash));
	const bPh = b.map((r) => BigInt(r.phash));
	const distances: number[] = [];
	const minLen = Math.min(aPh.length, bPh.length);
	for (let k = 0; k < minLen; k++) distances.push(hamming64(aPh[k], bPh[k]));
	// median
	distances.sort((x, y) => x - y);
	return distances[Math.floor(distances.length / 2)];
}

async function createGroup(client: Client, memberIds: number[], distance: number, reason: string): Promise<void> {
	// Upsert a dupe group with two members (idempotence not fully handled here; simplified)
	const rep = memberIds[0];
	const g = await client.query(`INSERT INTO dupe_groups (representative_image_id) VALUES ($1) RETURNING id`, [rep]);
	const groupId = g.rows[0].id as number;
	for (const id of memberIds) {
		await client.query(`INSERT INTO dupe_group_members (group_id, image_id, distance, reason) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [groupId, id, distance, reason]);
	}
}