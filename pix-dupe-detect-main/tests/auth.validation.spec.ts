import { test, expect } from '@playwright/test';

test.describe('Authentication Validation @smoke', () => {
  test('should show email validation error for invalid email', async ({ page }) => {
    await page.goto('/signin');
    
    // Fill in invalid email
    await page.getByTestId('email-input').fill('not-an-email');
    await page.getByTestId('password-input').fill('password123');
    
    // Submit form
    await page.getByTestId('auth-submit').click();
    
    // Wait for error to appear
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toContainText('Invalid email address');
  });

  test('should clear email error when valid email is entered', async ({ page }) => {
    await page.goto('/signin');
    
    // First submit with invalid email
    await page.getByTestId('email-input').fill('invalid');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('auth-submit').click();
    
    // Error should be visible
    await expect(page.getByTestId('email-error')).toBeVisible();
    
    // Clear and enter valid email
    await page.getByTestId('email-input').clear();
    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('auth-submit').click();
    
    // Error should be gone
    await expect(page.getByTestId('email-error')).not.toBeVisible();
  });

  test('should not show error for valid email format', async ({ page }) => {
    await page.goto('/signin');
    
    // Fill in valid email
    await page.getByTestId('email-input').fill('valid@example.com');
    await page.getByTestId('password-input').fill('password123');
    
    // Should not show error before submission
    await expect(page.getByTestId('email-error')).not.toBeVisible();
  });
});