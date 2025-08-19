import { test, expect } from '@playwright/test';

test.describe('Mock Authentication Flow', () => {
  test('app loads and shows landing page with sign-in option', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the landing page to load
    await page.waitForSelector('text=PixDupe Pro', { timeout: 10000 });
    
    // Verify we're on the landing page
    await expect(page).toHaveURL(/.*\/$/);
    
    // Check for sign-in button
    await expect(page.locator('a:has-text("Sign In")')).toBeVisible();
    // Check for demo button (use first one to avoid strict mode violation)
    await expect(page.locator('a:has-text("Demo")').first()).toBeVisible();
    
    console.log('✅ Landing page loads correctly with sign-in options');
  });

  test('can navigate to sign-in page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=PixDupe Pro');
    
    // Click the sign-in button
    await page.click('a:has-text("Sign In")');
    
    // Should navigate to sign-in page
    await page.waitForURL('**/signin', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/signin/);
    
    // Wait for the sign-in form to be visible
    await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="password-input"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="auth-submit"]', { timeout: 10000 });
    
    // Verify form elements are visible
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-submit"]')).toBeVisible();
    
    console.log('✅ Can navigate to sign-in page and form loads correctly');
  });

  test('form validation works', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForSelector('[data-testid="email-input"]');
    
    // Try to submit empty form
    await page.click('[data-testid="auth-submit"]');
    
    // Should stay on sign-in page (no redirect)
    await expect(page).toHaveURL(/.*\/signin/);
    
    // Fill in invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="auth-submit"]');
    
    // Should still be on sign-in page
    await expect(page).toHaveURL(/.*\/signin/);
    
    console.log('✅ Form validation working correctly');
  });

  test('app navigation works', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForSelector('[data-testid="email-input"]');
    
    // Test that we can navigate to other pages
    await page.goto('/dashboard');
    // Should redirect back to sign-in since we're not authenticated
    await page.waitForURL('**/signin', { timeout: 10000 });
    
    console.log('✅ Navigation and route guards working');
  });
});
