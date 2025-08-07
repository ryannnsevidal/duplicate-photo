import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up global test environment...');
  
  // Start browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...');
    const baseURL = config.webServer?.url || 'http://localhost:8080';
    
    // Try to access the app with retries
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await page.goto(baseURL, { timeout: 5000 });
        if (response && response.ok()) {
          console.log('✅ Development server is ready');
          break;
        }
      } catch (error) {
        console.log(`⏳ Waiting for server... (${retries} retries left)`);
        retries--;
        if (retries === 0) {
          throw new Error('Development server failed to start');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Set up demo mode if needed
    if (process.env.TEST_MODE === 'demo') {
      console.log('🎭 Running in demo mode - no Supabase setup required');
    } else {
      console.log('🗄️  Setting up test database...');
      // Here you could run database setup scripts if needed
      // For now, we'll rely on the demo mode functionality
    }

    // Create test state storage directory
    const fs = require('fs');
    const path = require('path');
    const testStateDir = path.join(process.cwd(), 'test-results', 'state');
    if (!fs.existsSync(testStateDir)) {
      fs.mkdirSync(testStateDir, { recursive: true });
    }

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
