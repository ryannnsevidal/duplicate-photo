// Minimal no-op fixture generator for E2E. Expand as needed.
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const outDir = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'generated');
if (!existsSync(outDir)) {
	mkdirSync(outDir, { recursive: true });
}

console.log(`[fixtures] Prepared directory: ${outDir}`);