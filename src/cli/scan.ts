#!/usr/bin/env node
import process from 'node:process';

function getFlag(name: string): string | undefined {
	const idx = process.argv.indexOf(`--${name}`);
	if (idx !== -1) return process.argv[idx + 1];
	return undefined;
}

function parseArgs(): { path?: string } {
	const [, , ...args] = process.argv;
	return { path: args.find((a) => !a.startsWith('--')) };
}

async function main(): Promise<void> {
	const { path } = parseArgs();
	const root = process.env.DUPE_ROOT;
	if (!root) {
		console.error('DUPE_ROOT must be set');
		process.exit(1);
	}
	// PDF knobs (set envs for worker)
	const pp = getFlag('pdf-max-pages'); if (pp) process.env.PDF_MAX_PAGES = pp;
	const ps = getFlag('pdf-sample'); if (ps) process.env.PDF_SAMPLE = ps;
	const pd = getFlag('pdf-raster-dpi'); if (pd) process.env.PDF_RASTER_DPI = pd;
	const pt = getFlag('pdf-text-threshold'); if (pt) process.env.SIMHASH_TEXT_THRESHOLD = pt;
	const pv = getFlag('pdf-visual-threshold'); if (pv) process.env.SIMILARITY_THRESHOLD_PDF = pv;
	const pj = getFlag('pdf-partial-threshold'); if (pj) process.env.PDF_PARTIAL_THRESHOLD = pj;
	const qp = getFlag('pdf-qpdf'); if (qp) process.env.QPDF_PATH = qp;
	console.log(`Scan starting. root=${root} path=${path ?? '<root>'}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});