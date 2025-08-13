import { test, expect } from '@playwright/test';

test('app builds and home loads', async ({ page }) => {
  await page.goto('/');
  // adjust selector if you have a root element
  await expect(page.locator('body')).toBeVisible();
});
