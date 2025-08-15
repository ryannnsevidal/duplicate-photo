import js from '@eslint/js'
import globals from 'globals'

export default [
	{
		ignores: ['pix-dupe-detect-main/**', 'dist/**', 'node_modules/**']
	},
	js.configs.recommended,
	// Ensure Node.js globals (console, process, etc.) are recognized in scripts
	{
		files: ['scripts/**/*.{js,mjs,cjs}', '*.mjs', '*.cjs'],
		languageOptions: {
			globals: globals.node,
		},
	},
]