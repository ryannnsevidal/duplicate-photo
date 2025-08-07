import { test, expect } from '@playwright/test';

test('Debug signin page', async ({ page }) => {
  await page.goto('/signin');
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot to see what's actually rendered
  await page.screenshot({ path: 'debug-signin.png', fullPage: true });
  
  // Check what elements are actually present
  const title = await page.locator('h1').first().textContent();
  console.log('Title found:', title);
  
  const emailVisible = await page.locator('input#email').isVisible();
  console.log('Email input visible:', emailVisible);
  
  const allInputs = await page.locator('input').count();
  console.log('Total inputs found:', allInputs);
  
  // Get all input types and IDs
  const inputs = await page.locator('input').all();
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const id = await inputs[i].getAttribute('id');
    console.log(`Input ${i}: type=${type}, id=${id}`);
  }
});
