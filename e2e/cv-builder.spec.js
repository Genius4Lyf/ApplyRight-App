import { test, expect } from '@playwright/test';

test.describe('ApplyRight Frontend', () => {
  test('should load the home page successfully', async ({ page }) => {
    // Navigate to the root URL
    await page.goto('/');

    // Verify that the page loads by checking if the body is visible
    await expect(page.locator('body')).toBeVisible();

    // Check for some text that we expect on the homepage/login page
    // Since we don't know the exact text, we simply ensure the app rendered
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
  });

  // A placeholder test for the CV Builder flow
  // To test the full flow, you'll need to handle authentication (e.g., logging in or mocking the API)
  test('CV builder route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/cv-builder/new');

    // As mentioned in CLAUDE.md, /cv-builder/:id is protected by ProtectedRoute
    // It should redirect the unauthenticated user
    await page.waitForURL('**/login*');
    await expect(page.url()).toContain('login');
  });
});
