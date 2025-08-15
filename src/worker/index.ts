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
	const maxConcurrency = Number(getEnv('CONCURRENCY', '8'));
	const similarityThreshold = Number(getEnv('SIMILARITY_THRESHOLD', '8'));

	console.log(
		JSON.stringify(
			{
				DATABASE_URL: databaseUrl ? '<set>' : '<missing>',
				DUPE_ROOT: rootDir || '<missing>',
				THUMBNAIL_DIR: thumbnailsDir || '<missing>',
				TRASH_DIR: trashDir || '<missing>',
				CONCURRENCY: maxConcurrency,
				SIMILARITY_THRESHOLD: similarityThreshold,
			},
			null,
			2,
		),
	);

	setInterval(() => {
		process.stdout.write('.');
	}, 30000);
}

main().catch((error) => {
	console.error('[worker] fatal error', error);
	process.exit(1);
});