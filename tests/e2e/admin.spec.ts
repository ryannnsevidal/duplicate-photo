import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to app and sign in as admin
    await page.goto('/');
    
    // Fill in admin credentials
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for admin redirect
    await page.waitForURL(/\/admin/, { timeout: 15000 });
  });

  test('admin can access admin dashboard', async ({ page }) => {
    // Verify we're on admin page
    await expect(page).toHaveURL(/\/admin/);
    
    // Check for admin dashboard elements
    const adminHeader = page.locator('text=Admin Dashboard')
      .or(page.locator('h1:has-text("Admin")'))
      .or(page.locator('[data-testid="admin-dashboard"]'));
    
    await expect(adminHeader.first()).toBeVisible();
    
    // Check for admin badge or indicator
    const adminBadge = page.locator('text=Admin')
      .or(page.locator('[data-testid="admin-badge"]'));
    
    await expect(adminBadge.first()).toBeVisible();
  });

  test('admin can view upload history', async ({ page }) => {
    // Look for upload history section
    const uploadHistory = page.locator('text=Upload History')
      .or(page.locator('text=File Uploads'))
      .or(page.locator('[data-testid="upload-history"]'));
    
    await expect(uploadHistory.first()).toBeVisible();
    
    // Check for table headers or structure
    const tableHeaders = page.locator('text=Filename')
      .or(page.locator('text=User'))
      .or(page.locator('text=Upload Date'));
    
    await expect(tableHeaders.first()).toBeVisible();
  });

  test('admin can view user sessions', async ({ page }) => {
    // Look for session monitoring section
    const sessionMonitor = page.locator('text=Active Sessions')
      .or(page.locator('text=User Sessions'))
      .or(page.locator('[data-testid="session-monitor"]'));
    
    await expect(sessionMonitor.first()).toBeVisible();
    
    // Check for session information
    const sessionInfo = page.locator('text=IP Address')
      .or(page.locator('text=Browser'))
      .or(page.locator('text=Device'));
    
    await expect(sessionInfo.first()).toBeVisible();
  });

  test('admin can view duplicate detection logs', async ({ page }) => {
    // Look for duplicate detection section
    const duplicateLogs = page.locator('text=Duplicate Detection')
      .or(page.locator('text=Analysis Logs'))
      .or(page.locator('[data-testid="duplicate-logs"]'));
    
    await expect(duplicateLogs.first()).toBeVisible();
    
    // Check for analysis information
    const analysisInfo = page.locator('text=Similarity Score')
      .or(page.locator('text=Hash'))
      .or(page.locator('text=Match'));
    
    await expect(analysisInfo.first()).toBeVisible();
  });

  test('admin can view system statistics', async ({ page }) => {
    // Look for statistics section
    const statistics = page.locator('text=Statistics')
      .or(page.locator('text=System Stats'))
      .or(page.locator('[data-testid="system-stats"]'));
    
    await expect(statistics.first()).toBeVisible();
    
    // Check for metric cards
    const metrics = page.locator('text=Total Users')
      .or(page.locator('text=Total Uploads'))
      .or(page.locator('text=Duplicates Found'));
    
    await expect(metrics.first()).toBeVisible();
  });

  test('admin can view security monitoring', async ({ page }) => {
    // Look for security section
    const securitySection = page.locator('text=Security')
      .or(page.locator('text=Security Monitoring'))
      .or(page.locator('[data-testid="security-monitor"]'));
    
    await expect(securitySection.first()).toBeVisible();
    
    // Check for security metrics
    const securityMetrics = page.locator('text=Failed Logins')
      .or(page.locator('text=Active Sessions'))
      .or(page.locator('text=Suspicious Activity'));
    
    await expect(securityMetrics.first()).toBeVisible();
  });

  test('admin dashboard is responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should still be functional on mobile
    const adminHeader = page.locator('text=Admin Dashboard')
      .or(page.locator('h1:has-text("Admin")'));
    
    await expect(adminHeader.first()).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await expect(adminHeader.first()).toBeVisible();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('admin can navigate between sections', async ({ page }) => {
    // Check for navigation elements
    const navItems = page.locator('[data-testid="admin-nav"]')
      .or(page.locator('.admin-navigation'))
      .or(page.locator('nav'));
    
    if (await navItems.first().isVisible()) {
      // Test navigation if it exists
      const navLinks = page.locator('a').or(page.locator('button'));
      const linkCount = await navLinks.count();
      
      if (linkCount > 0) {
        // Click first navigation item
        await navLinks.first().click();
        
        // Verify page updated
        await page.waitForTimeout(1000);
        
        // Should still be on admin page
        await expect(page).toHaveURL(/\/admin/);
      }
    }
  });

  test('admin can sign out from dashboard', async ({ page }) => {
    // Look for sign out button
    const signOutButton = page.locator('button:has-text("Sign Out")')
      .or(page.locator('text=Sign Out'))
      .or(page.locator('[data-testid="sign-out"]'));
    
    await expect(signOutButton.first()).toBeVisible();
    
    // Click sign out
    await signOutButton.first().click();
    
    // Should redirect to login page
    await page.waitForURL(/\/login|\//, { timeout: 10000 });
    
    // Should show login form
    const authForm = page.locator('[data-testid="auth-form"]')
      .or(page.locator('form'))
      .or(page.locator('text=Welcome Back'));
    
    await expect(authForm.first()).toBeVisible();
  });

  test('admin has appropriate permissions', async ({ page }) => {
    // Admin should see admin-only elements
    const adminElements = page.locator('[data-admin-only]')
      .or(page.locator('.admin-only'))
      .or(page.locator('text=Admin Only'));
    
    // If admin-only elements exist, they should be visible
    const count = await adminElements.count();
    if (count > 0) {
      await expect(adminElements.first()).toBeVisible();
    }
    
    // Should see admin badge
    const adminBadge = page.locator('text=Admin')
      .or(page.locator('[data-testid="admin-badge"]'));
    
    await expect(adminBadge.first()).toBeVisible();
  });

});

test.describe('Admin Security', () => {
  test('should prevent direct admin access without auth', async ({ page }) => {
    // Try to access admin routes directly without authentication
    await page.goto('/admin');
    
    // Should redirect to signin or show unauthorized
    await expect(page.locator('text=Welcome Back').or(page.locator('text=Sign in'))).toBeVisible({ timeout: 5000 });
  });

  test('should prevent admin access for regular users', async ({ page }) => {
    await page.goto('/');
    
    // Sign in as regular user
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for login
    await expect(page.locator('text=Welcome back!')).toBeVisible({ timeout: 10000 });
    
    // Try to access admin route
    await page.goto('/admin');
    
    // Should be redirected away from admin or show access denied
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/admin');
  });
});
