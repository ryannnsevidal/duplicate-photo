import Fastify from 'fastify';
import process from 'node:process';

const fastify = Fastify({ logger: true });

fastify.get('/health', async () => ({ ok: true }));

fastify.get('/', async () => ({ name: 'duplicate-photo', status: 'ok' }));

async function start() {
	const port = Number(process.env.PORT || 3000);
	await fastify.listen({ port, host: '0.0.0.0' });
}

start().catch((err) => {
	fastify.log.error(err);
	process.exit(1);
});