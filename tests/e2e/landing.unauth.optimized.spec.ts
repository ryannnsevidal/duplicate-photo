import { test as base, expect } from '@playwright/test';

// Define fixture types
type LandingPageFixtures = {
  landingPage: LandingPage;
};

// Landing page object with cached selectors
class LandingPage {
  constructor(public page: any) {}

  // Cached selectors - initialize once
  private _selectors = {
    title: 'h1',
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]',
    submitButton: 'button[type="submit"]',
    demoModeText: 'text=Demo Mode',
    welcomeBackText: 'text=Welcome Back',
    googleButton: 'text=Continue with Google',
    demoCredentialsText: 'text=Demo Mode Credentials',
    signUpLink: 'text=Don\'t have an account? Sign up',
    signInLink: 'text=Already have an account? Sign in',
    createAccountText: 'text=Create Account'
  };

  // Pre-load and cache common elements
  async initialize() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' }); // Faster than waiting for full load
    
    // Pre-warm critical selectors
    await this.page.locator(this._selectors.title).first();
    await this.page.locator(this._selectors.emailInput).first();
    await this.page.locator(this._selectors.passwordInput).first();
    
    return this;
  }

  // Fast methods using cached selectors
  async checkBasicLayout() {
    const [title, email, password] = await Promise.all([
      this.page.locator(this._selectors.title).first(),
      this.page.locator(this._selectors.emailInput).first(),
      this.page.locator(this._selectors.passwordInput).first()
    ]);

    await Promise.all([
      expect(title).toContainText('Duplicate Photo Detector'),
      expect(email).toBeVisible(),
      expect(password).toBeVisible()
    ]);
  }

  async checkDemoElements() {
    const [demoMode, demoCredentials, welcomeBack] = await Promise.all([
      this.page.locator(this._selectors.demoModeText).first(),
      this.page.locator(this._selectors.demoCredentialsText).first(),
      this.page.locator(this._selectors.welcomeBackText).first()
    ]);

    await Promise.all([
      expect(demoMode).toBeVisible(),
      expect(demoCredentials).toBeVisible(),
      expect(welcomeBack).toBeVisible()
    ]);
  }

  async fillCredentials(email: string, password: string) {
    await Promise.all([
      this.page.fill(this._selectors.emailInput, email),
      this.page.fill(this._selectors.passwordInput, password)
    ]);
  }

  async clickSubmit() {
    await this.page.click(this._selectors.submitButton);
  }

  async checkFormValidation() {
    const [emailInput, passwordInput] = await Promise.all([
      this.page.locator(this._selectors.emailInput).first(),
      this.page.locator(this._selectors.passwordInput).first()
    ]);

    await Promise.all([
      expect(emailInput).toHaveAttribute('required'),
      expect(passwordInput).toHaveAttribute('required')
    ]);
  }

  async checkOAuthButton() {
    const googleButton = this.page.locator(this._selectors.googleButton).first();
    await Promise.all([
      expect(googleButton).toBeVisible(),
      expect(googleButton).toBeEnabled()
    ]);
  }
}

// Create test with fixtures
const test = base.extend<LandingPageFixtures>({
  landingPage: async ({ page }, use) => {
    const landingPage = new LandingPage(page);
    await landingPage.initialize();
    await use(landingPage);
  }
});

test.describe('Unauthenticated User Experience - Optimized', () => {
  
  // Group related tests to share page load
  test.describe('Layout and Basic Elements', () => {
    test('should display landing page correctly', async ({ landingPage }) => {
      await landingPage.checkBasicLayout();
      await landingPage.checkDemoElements();
    });

    test('should show demo credentials and OAuth', async ({ landingPage }) => {
      await Promise.all([
        landingPage.checkDemoElements(),
        landingPage.checkOAuthButton()
      ]);
    });

    test('should have proper form validation', async ({ landingPage }) => {
      await landingPage.clickSubmit();
      await landingPage.checkFormValidation();
    });
  });

  test.describe('Interactive Features', () => {
    test('should handle form submission and errors', async ({ landingPage }) => {
      // Test invalid credentials
      await landingPage.fillCredentials('invalid@example.com', 'wrongpassword');
      await landingPage.clickSubmit();
      
      // Check for error message (optimized with timeout)
      const errorMessage = landingPage.page.locator('text=Invalid demo credentials')
        .or(landingPage.page.locator('text=Invalid credentials'))
        .or(landingPage.page.locator('[data-testid="error-message"]'));
      
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    });

    test('should handle successful demo login', async ({ landingPage }) => {
      await landingPage.fillCredentials('demo@example.com', 'demo123');
      await landingPage.clickSubmit();
      
      // Should redirect or show success (quick check)
      await expect(landingPage.page).toHaveURL(/\/(dashboard|upload|home)/, { timeout: 5000 });
    });
  });

  // Separate test for responsive to avoid viewport interference
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const landingPage = new LandingPage(page);
    await landingPage.initialize();
    
    // Quick mobile checks
    await landingPage.checkBasicLayout();
    await landingPage.fillCredentials('demo@example.com', 'demo123');
    
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });

  // Keyboard navigation in separate test
  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Efficient keyboard navigation test
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  // Quick SEO check
  test('should have proper SEO elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Fast parallel checks
    await Promise.all([
      expect(page).toHaveTitle(/PIX DUPE DETECT|Duplicate Photo Detector/),
      page.locator('h1').first().textContent().then(text => {
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(5);
      })
    ]);
  });

});

export { test, expect };
