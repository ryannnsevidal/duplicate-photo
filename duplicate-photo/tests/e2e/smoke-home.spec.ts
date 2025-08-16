import { test, expect } from '@playwright/test';

test('home loads without URL crash', async ({ page }) => {
	page.on('pageerror', err => {
		if (/Failed to construct 'URL'/.test(String(err))) throw err;
	});
	await page.goto('http://localhost:5173/');
	await expect(page.locator('body')).toBeVisible();
});