import { test, expect } from '@playwright/test';

test('sidebar becomes visible when mouse hovers near left edge', async ({ page }) => {
  test.setTimeout(30000);
  
  await page.goto('/lobby', { waitUntil: 'domcontentloaded' });
  
  // Wait for initial render
  await page.waitForTimeout(2000);
  
  // Dispatch a real mousemove event to trigger the sidebar
  await page.evaluate(() => {
    const event = new MouseEvent('mousemove', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: 20,
      clientY: 300,
    });
    window.dispatchEvent(event);
  });
  
  await page.waitForTimeout(500);
  
  // Check if sidebar appears
  const sidebar = page.locator('text=₿TC Menu');
  await expect(sidebar).toBeVisible({ timeout: 5000 });
  
  console.log('Sidebar is visible!');
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'test-results/sidebar-visible.png' });
});
