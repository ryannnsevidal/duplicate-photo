import { test, expect } from '@playwright/test';

test('app builds and home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
});
