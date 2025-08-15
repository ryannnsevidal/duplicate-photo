import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export async function canonicalizePdf(inputPath: string): Promise<string | null> {
	const qpdfPath = process.env.QPDF_PATH || 'qpdf';
	const timeout = Number(process.env.CANON_TIMEOUT_MS || '15000');
	try {
		const outDir = await mkdtemp(path.join(tmpdir(), 'qpdf-'));
		const outPath = path.join(outDir, 'norm.pdf');
		await execFileAsync(qpdfPath, [
			'--linearize',
			'--object-streams=disable',
			'--decode-level=all',
			'--stream-data=uncompress',
			'--newline-before-endstream',
			inputPath,
			outPath,
		], { timeout });
		return outPath;
	} catch {
		// JS fallback: strip trivial metadata (best-effort, non-exhaustive)
		try {
			const buf = await readFile(inputPath);
			const text = buf.toString('binary');
			const withoutInfo = text.replace(/\/Info\s+\d+\s+\d+\s+R/g, '');
			const withoutDates = withoutInfo.replace(/(CreationDate|ModDate)\s*\(.*?\)/g, '$1()');
			const out = Buffer.from(withoutDates, 'binary');
			const outDir = await mkdtemp(path.join(tmpdir(), 'qpdf-fb-'));
			const outPath = path.join(outDir, 'norm.pdf');
			await writeFile(outPath, out);
			return outPath;
		} catch {
			return null;
		}
	}
}

export async function cleanupCanonical(pathOrNull: string | null): Promise<void> {
	if (!pathOrNull) return;
	try { await unlink(pathOrNull); } catch {}
}

function execFileAsync(cmd: string, args: string[], opts: { timeout: number }): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = execFile(cmd, args, { timeout: opts.timeout }, (err) => {
			if (err) reject(err); else resolve();
		});
		child.on('error', reject);
	});
}