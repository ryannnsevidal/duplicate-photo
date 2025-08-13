import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Local File Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as regular user for upload tests
    await page.goto('/signin');
    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('auth-submit').click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('should upload a local file and show in recent uploads @smoke', async ({ page }) => {
    // Navigate to upload section if not already there
    await page.goto('/');
    
    // Wait for upload components to be visible
    await expect(page.getByTestId('local-file-input')).toBeVisible();
    
    // Upload test file
    const filePath = path.join(__dirname, 'fixtures', 'sample.png');
    await page.getByTestId('local-file-input').setInputFiles(filePath);
    
    // Click upload button
    await page.getByTestId('upload-submit').click();
    
    // Wait for upload completion (toast or success indicator)
    await page.waitForTimeout(2000);
    
    // Check if file appears in recent uploads
    await expect(page.getByTestId('recent-uploads')).toBeVisible();
    
    // Look for the uploaded file
    await expect(page.getByText('sample.png')).toBeVisible({ timeout: 10000 });
  });

  test('should handle multiple file uploads', async ({ page }) => {
    await page.goto('/');
    
    // Upload multiple files via file input
    const filePath = path.join(__dirname, 'fixtures', 'sample.png');
    await page.getByTestId('local-file-input').setInputFiles([filePath, filePath]);
    
    // Should show selected files
    await expect(page.getByText('Selected Files (2)')).toBeVisible();
    
    // Upload files
    await page.getByTestId('upload-submit').click();
    
    // Wait for completion
    await page.waitForTimeout(2000);
  });

  test('should show error for unauthenticated upload attempt', async ({ page }) => {
    // Sign out first
    await page.goto('/logout');
    await page.goto('/');
    
    // Try to upload without being signed in
    await expect(page.getByText('Please sign in to upload files')).toBeVisible();
    await expect(page.getByTestId('upload-submit')).toBeDisabled();
  });
});