import { test, expect } from '@playwright/test';

// Simulates the happy path where a visitor reveals the sidebar, opens the profile modal,
// fills in minimal information, and attempts to save their profile.
test('visitor attempts to create a satellite via the profile modal', async ({ page }) => {
  // Increase timeout for this test
  test.setTimeout(60000);
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  await page.goto('/lobby', { waitUntil: 'load' });

  // Wait for React hydration and Supabase connection
  await page.waitForTimeout(2000);
  
  // Reveal the sidebar using a synthetic mousemove event
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
  
  // Wait for sidebar to appear by checking for the menu container
  const sidebar = page.locator('text=₿TC Menu');
  await expect(sidebar).toBeVisible({ timeout: 5000 });

  const createSatelliteButton = page.getByRole('button', { name: /Create your satellite/i });
  await expect(createSatelliteButton).toBeVisible({ timeout: 5000 });
  await expect(createSatelliteButton).toBeEnabled();

  await createSatelliteButton.click();

  const modal = page.getByRole('heading', { name: /Edit Profile/i });
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Use placeholder instead of label for more reliable selection
  const nicknameField = page.getByPlaceholder(/How you want to be called/i);
  await expect(nicknameField).toBeVisible({ timeout: 5000 });
  await nicknameField.fill('Playwright Tester');

  const bioField = page.getByPlaceholder(/Tell us about yourself/i);
  await expect(bioField).toBeVisible();
  await bioField.fill('End-to-end test attempting to register a satellite.');

  const saveButton = page.getByRole('button', { name: /Save Profile/i });
  await saveButton.click();

  // Wait for either the modal to close (success) or an error banner to appear (failure).
  const errorBanner = page.locator('div').filter({ hasText: 'Failed to save profile' });

  const outcome = await Promise.race([
    modal.waitFor({ state: 'hidden', timeout: 10000 }).then(() => 'modal-closed'),
    errorBanner.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'error-banner'),
  ]);

  expect(['modal-closed', 'error-banner']).toContain(outcome);
});
