import js from '@eslint/js'
import globals from 'globals'

export default [
	{
		ignores: ['pix-dupe-detect-main/**', 'dist/**', 'node_modules/**']
	},
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
	},
	js.configs.recommended,
]