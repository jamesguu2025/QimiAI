import { test, expect, type Page } from '@playwright/test';
import { PARENTAL_CONSENT_TEXT } from '../lib/compliance/consent';

const PASSWORD = 'CodexTest123!';

async function signInTestUser(page: Page, email: string) {
  const signup = await page.request.post('/api/auth/signup', {
    data: {
      email,
      password: PASSWORD,
      name: 'Playwright Test Parent',
    },
  });
  expect([201, 400]).toContain(signup.status());

  const csrf = await page.request.get('/api/auth/csrf');
  expect(csrf.ok()).toBe(true);
  const { csrfToken } = await csrf.json();

  const login = await page.request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email,
      password: PASSWORD,
      callbackUrl: 'http://127.0.0.1:4000/chat',
      json: 'true',
    },
  });
  expect(login.ok()).toBe(true);
}

async function prepareAccount(page: Page) {
  const consent = await page.request.post('/api/compliance/consent', {
    data: { consentText: PARENTAL_CONSENT_TEXT },
  });
  expect(consent.ok()).toBe(true);

  const family = await page.request.post('/api/family', {
    data: {
      name: 'Milo',
      birthYear: 2017,
      birthMonth: 5,
      gender: 'boy',
    },
  });
  expect(family.ok()).toBe(true);
}

async function currentFactValues(page: Page): Promise<string[]> {
  const response = await page.request.get('/api/memory/facts');
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return (body.facts || []).map((fact: { value?: string }) => fact.value || '');
}

test('live chat triggers learning for concrete family context', async ({ page }) => {
  test.setTimeout(180_000);

  const email = `playwright-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await signInTestUser(page, email);
  await prepareAccount(page);

  await page.goto('/chat');
  await expect(page.locator('body')).toContainText(/Hi, I'm Qimi AI|Ask anything/);

  const beforeFacts = await currentFactValues(page);

  await page.getByPlaceholder('Ask anything...').fill(
    'My son Milo is 8, and my husband and I argue every night because he refuses homework after dinner.'
  );
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByText(/Milo is 8|husband and I argue|refuses homework/i)).toBeVisible();
  await expect(page.getByPlaceholder('Ask anything...')).toBeEnabled({ timeout: 90_000 });

  await expect.poll(
    async () => {
      const facts = await currentFactValues(page);
      return facts.length - beforeFacts.length;
    },
    {
      timeout: 90_000,
      intervals: [3_000, 5_000, 10_000],
    }
  ).toBeGreaterThan(0);

  const afterFacts = await currentFactValues(page);
  expect(afterFacts.join(' ').toLowerCase()).toMatch(/milo|husband|homework|argue|son|child/);
});
