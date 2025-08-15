import Fastify from 'fastify';
import process from 'node:process';
import { withPg } from '../db/client';
import { groupPdfs } from '../grouper/pdfGrouper';

const fastify = Fastify({ logger: true });

fastify.get('/health', async () => ({ ok: true }));

fastify.get('/groups', async (req) => {
	const q: any = (req as any).query || {};
	const type = q.type || 'pdf';
	const threshold = Number(q.threshold ?? (process.env.SIMILARITY_THRESHOLD_PDF || '8'));
	const textThreshold = Number(q.textThreshold ?? (process.env.SIMHASH_TEXT_THRESHOLD || '6'));
	if (type !== 'pdf') return { groups: [] };
	await withPg(async (client) => {
		await groupPdfs(client, textThreshold, threshold);
	});
	const groups = await withPg(async (client) => {
		const { rows } = await client.query(`SELECT g.id, g.representative_image_id, json_agg(json_build_object('image_id', m.image_id, 'distance', m.distance, 'reason', m.reason)) AS members FROM dupe_groups g JOIN dupe_group_members m ON m.group_id=g.id GROUP BY g.id, g.representative_image_id ORDER BY g.id DESC LIMIT 50`);
		return rows;
	});
	return { groups };
});

fastify.get('/groups/:id', async (req) => {
	const id = Number((req.params as any).id);
	const group = await withPg(async (client) => {
		const { rows } = await client.query(`SELECT m.image_id, m.distance, m.reason FROM dupe_group_members m WHERE m.group_id=$1`, [id]);
		return rows;
	});
	return { id, members: group };
});

async function start() {
	const port = Number(process.env.PORT || 3000);
	await fastify.listen({ port, host: '0.0.0.0' });
}

start().catch((err) => {
	fastify.log.error(err);
	process.exit(1);
});