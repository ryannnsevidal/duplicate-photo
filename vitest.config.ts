import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		exclude: [
			'node_modules/**',
			'dist/**',
			'pix-dupe-detect-main/**',
			'e2e/**',
			'tests/**',
			'src/components/**',
			'src/hooks/**',
			'src/utils/**',
			'src/types/**',
			'src/pdf/**',
		],
	},
})