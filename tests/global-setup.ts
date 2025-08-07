import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log('🔧 Global Setup: Pre-warming application...');
  
  // Launch browser for pre-warming
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-accelerated-2d-canvas'
    ]
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Pre-warm the landing page
    console.log('📄 Pre-warming landing page...');
    await page.goto(baseURL || 'http://localhost:8080', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Cache common selectors by triggering them
    await Promise.all([
      page.locator('h1').first().isVisible(),
      page.locator('input[type="email"]').first().isVisible(),
      page.locator('input[type="password"]').first().isVisible(),
      page.locator('button[type="submit"]').first().isVisible()
    ]);
    
    console.log('✅ Application pre-warmed successfully');
    
  } catch (error) {
    console.warn('⚠️ Pre-warming failed, tests will run cold:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
