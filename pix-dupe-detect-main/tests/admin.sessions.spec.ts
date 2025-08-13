import { test, expect } from '@playwright/test';

test.describe('Admin Sessions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin user
    await page.goto('/signin');
    await page.getByTestId('email-input').fill('rsevidal117@gmail.com');
    await page.getByTestId('password-input').fill('admin123');
    await page.getByTestId('auth-submit').click();
    
    // Wait for redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should display admin sessions panel @smoke', async ({ page }) => {
    // Should be on admin page
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    
    // Check for admin sessions section
    await expect(page.getByTestId('admin-sessions')).toBeVisible();
    
    // Should show active sessions or "No active sessions" message
    const sessionsPanel = page.getByTestId('admin-sessions');
    await expect(sessionsPanel).toBeVisible();
  });

  test('should display admin uploads panel', async ({ page }) => {
    await expect(page.getByTestId('admin-uploads')).toBeVisible();
  });

  test('should display security log panel', async ({ page }) => {
    await expect(page.getByTestId('admin-security-log')).toBeVisible();
  });

  test('should show administrator badge', async ({ page }) => {
    await expect(page.getByText('Administrator')).toBeVisible();
  });

  test('should prevent non-admin access', async ({ page }) => {
    // Sign out and sign in as regular user
    await page.goto('/logout');
    await page.goto('/signin');
    
    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('auth-submit').click();
    
    // Try to access admin page
    await page.goto('/admin');
    
    // Should be redirected away from admin page
    await expect(page).not.toHaveURL(/\/admin/);
    
    // Should show unauthorized message
    await expect(page.getByText('Not Authorized')).toBeVisible();
  });
});