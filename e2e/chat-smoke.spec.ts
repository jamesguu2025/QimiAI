import { test, expect } from '@playwright/test';

test('chat route renders a usable entry screen', async ({ page }) => {
  await page.goto('/chat');

  await expect(page.locator('body')).toContainText(/Tell us about your child|Hi, I'm Qimi AI/);
});
