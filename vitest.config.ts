import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	test: {
		environment: 'node',
		globals: true,
		// Do NOT pick up Playwright suites or the frontend app tests here
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/e2e/**',
			'**/tests/**',
			'pix-dupe-detect-main/**',
			'src/components/**',
			'src/utils/**',
		],
	},
})
