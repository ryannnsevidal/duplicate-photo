import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up global test environment...');
  
  try {
    // Clean up test files if any were created
    const fs = require('fs');
    const path = require('path');
    
    // Remove test uploads if any
    const testUploadsDir = path.join(process.cwd(), 'test-uploads');
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
      console.log('🗑️  Cleaned up test uploads');
    }

    // Clean up test state files
    const testStateDir = path.join(process.cwd(), 'test-results', 'state');
    if (fs.existsSync(testStateDir)) {
      const stateFiles = fs.readdirSync(testStateDir);
      for (const file of stateFiles) {
        if (file.startsWith('test-')) {
          fs.unlinkSync(path.join(testStateDir, file));
        }
      }
      console.log('🗑️  Cleaned up test state files');
    }

    // Log test completion
    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown error:', error);
    // Don't throw to avoid failing the entire test suite
  }
}

export default globalTeardown;
