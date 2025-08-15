import js from '@eslint/js'
import globals from 'globals'

export default [
	{
		ignores: ['pix-dupe-detect-main/**', 'dist/**', 'node_modules/**']
	},
	js.configs.recommended,
	// Only lint our backend/worker/scripts TS/JS; ignore frontend app under pix-dupe-detect-main
	{
		files: ['src/**/*.{ts,tsx}', 'scripts/**/*.{js,mjs,ts}', 'migrations/**/*.ts'],
	},
	// Ensure Node.js globals (console, process, etc.) are recognized in scripts
	{
		files: ['scripts/**/*.{js,mjs,cjs}', '*.mjs', '*.cjs'],
		languageOptions: {
			globals: globals.node,
		},
	},
]