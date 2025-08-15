#!/usr/bin/env node
import process from 'node:process';

function parseArgs(): { path?: string } {
	const [, , ...args] = process.argv;
	return { path: args[0] };
}

async function main(): Promise<void> {
	const { path } = parseArgs();
	const root = process.env.DUPE_ROOT;
	if (!root) {
		console.error('DUPE_ROOT must be set');
		process.exit(1);
	}
	console.log(`Scan starting. root=${root} path=${path ?? '<root>'}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});