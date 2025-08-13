import { test, expect } from '@playwright/test';

test.describe('Landing Page - Unauthenticated @smoke', () => {
  test('should show sign in form elements', async ({ page }) => {
    await page.goto('/signin');
    
    // Check for form inputs
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('auth-submit')).toBeVisible();
    
    // Check for Google OAuth button
    await expect(page.getByTestId('google-oauth-btn')).toBeVisible();
    
    // Check for toggle to sign up
    await expect(page.getByTestId('toggle-auth-mode')).toBeVisible();
  });

  test('should toggle between sign in and sign up modes', async ({ page }) => {
    await page.goto('/signin');
    
    // Initially should show "Sign In"
    await expect(page.getByTestId('auth-submit')).toHaveText('Sign In');
    
    // Click toggle to switch to sign up
    await page.getByTestId('toggle-auth-mode').click();
    
    // Should now show "Sign Up"
    await expect(page.getByTestId('auth-submit')).toHaveText('Sign Up');
    
    // Click toggle again to switch back
    await page.getByTestId('toggle-auth-mode').click();
    
    // Should be back to "Sign In"
    await expect(page.getByTestId('auth-submit')).toHaveText('Sign In');
  });
});