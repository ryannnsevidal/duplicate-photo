import { test as cleanup } from '@playwright/test';
import fs from 'fs';

/**
 * Cleanup after all tests complete
 * Removes temporary files and resets state
 */
cleanup('cleanup auth state', async () => {
  console.log('🧹 Cleaning up test artifacts...');
  
  // Remove auth state files
  const authFiles = [
    'tests/fixtures/auth-state.json',
    'tests/fixtures/admin-auth-state.json'
  ];
  
  authFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`🗑️ Removed ${file}`);
    }
  });
  
  console.log('✅ Cleanup complete');
});
