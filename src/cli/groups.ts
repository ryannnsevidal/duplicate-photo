#!/usr/bin/env node
import process from 'node:process';
import { withPg } from '../db/client';
import { groupPdfs } from '../grouper/pdfGrouper';

function getArg(name: string, def?: string): string | undefined {
	const idx = process.argv.indexOf(`--${name}`);
	if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
	return def;
}

async function main() {
	const textThreshold = Number(getArg('text-threshold', process.env.SIMHASH_TEXT_THRESHOLD || '6'));
	const threshold = Number(getArg('threshold', process.env.SIMILARITY_THRESHOLD_PDF || '8'));
	await withPg(async (client) => {
		await groupPdfs(client, textThreshold, threshold);
		const { rows } = await client.query('SELECT g.id, array_agg(m.image_id) AS members FROM dupe_groups g JOIN dupe_group_members m ON m.group_id=g.id GROUP BY g.id ORDER BY g.id DESC LIMIT 20');
		console.log(JSON.stringify({ groups: rows }, null, 2));
	});
}

main().catch((e) => { console.error(e); process.exit(1); });