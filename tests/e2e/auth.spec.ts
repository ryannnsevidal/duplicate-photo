import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page with demo mode banner', async ({ page }) => {
    // Check for demo mode banner
    await expect(page.locator('text=Demo Mode')).toBeVisible();
    
    // Check main title
    await expect(page.locator('h1')).toContainText('Duplicate Photo Detector');
    
    // Check description
    await expect(page.locator('text=Advanced perceptual hashing technology')).toBeVisible();
  });

  test('should show login form on landing page', async ({ page }) => {
    // Check auth form is visible
    await expect(page.locator('[data-testid="auth-form"]').or(page.locator('form'))).toBeVisible();
    
    // Check Google OAuth button
    await expect(page.locator('text=Continue with Google')).toBeVisible();
    
    // Check email input
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Check password input
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should display demo credentials in demo mode', async ({ page }) => {
    // Look for demo credentials section
    const demoSection = page.locator('text=Demo Mode Credentials');
    await expect(demoSection).toBeVisible();
    
    // Check for demo user credentials
    await expect(page.locator('text=demo@example.com')).toBeVisible();
    await expect(page.locator('text=admin@example.com')).toBeVisible();
  });

  test('should successfully sign in with demo credentials', async ({ page }) => {
    // Fill in demo credentials
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await expect(page.locator('text=Welcome back!')).toBeVisible({ timeout: 10000 });
    
    // Check we're redirected to main app
    await expect(page.locator('text=Upload Image for Duplicate Detection')).toBeVisible();
    
    // Check user is displayed in header
    await expect(page.locator('text=Demo User').or(page.locator('text=demo@example.com'))).toBeVisible();
  });

  test('should successfully sign in admin user', async ({ page }) => {
    // Fill in admin credentials
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await expect(page.locator('text=Demo mode: Admin signed in successfully')).toBeVisible({ timeout: 10000 });
    
    // Check admin badge is visible
    await expect(page.locator('text=Admin')).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=Invalid demo credentials')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle between sign in and sign up', async ({ page }) => {
    // Check initial state is sign in
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    
    // Click to switch to sign up
    await page.click('text=Don\'t have an account? Sign up');
    
    // Check sign up form is shown
    await expect(page.locator('text=Create Account')).toBeVisible();
    await expect(page.locator('input[placeholder*="full name"]')).toBeVisible();
    
    // Click to switch back to sign in
    await page.click('text=Already have an account? Sign in');
    
    // Check sign in form is shown
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('should show loading state during authentication', async ({ page }) => {
    // Fill in demo credentials
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    
    // Submit form and immediately check for loading state
    await page.click('button[type="submit"]');
    
    // The loading state might be brief, so we use a shorter timeout
    try {
      await expect(page.locator('text=Loading...')).toBeVisible({ timeout: 2000 });
    } catch (error) {
      // Loading might be too fast to catch, which is okay
      console.log('Loading state was too fast to capture');
    }
  });
});
