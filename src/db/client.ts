import { Client } from 'pg';

export async function withPg<T>(fn: (client: Client) => Promise<T>): Promise<T> {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');
	const client = new Client({ connectionString: url });
	await client.connect();
	try {
		return await fn(client);
	} finally {
		await client.end();
	}
}