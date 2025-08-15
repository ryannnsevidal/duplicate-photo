import js from '@eslint/js'

export default [
	{
		ignores: ['pix-dupe-detect-main/**', 'dist/**', 'node_modules/**']
	},
	js.configs.recommended,
]