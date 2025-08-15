import process from 'node:process';

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
	const thumbnailsDir = getEnv('THUMBNAIL_DIR');
	const trashDir = getEnv('TRASH_DIR');
	const maxConcurrency = Number(getEnv('MAX_CONCURRENCY', '8'));
	const hashAlgo = getEnv('HASH_ALGO', 'phash');
	const similarityThreshold = Number(getEnv('SIMILARITY_THRESHOLD', '8'));

	console.log(
		JSON.stringify(
			{
				DATABASE_URL: databaseUrl ? '<set>' : '<missing>',
				DUPE_ROOT: rootDir || '<missing>',
				THUMBNAIL_DIR: thumbnailsDir || '<missing>',
				TRASH_DIR: trashDir || '<missing>',
				MAX_CONCURRENCY: maxConcurrency,
				HASH_ALGO: hashAlgo,
				SIMILARITY_THRESHOLD: similarityThreshold,
			},
			null,
			2,
		),
	);

	// Placeholder idle loop. Replace with queue + scanner pipeline.
	setInterval(() => {
		process.stdout.write('.');
	}, 30000);
}

main().catch((error) => {
	console.error('[worker] fatal error', error);
	process.exit(1);
});