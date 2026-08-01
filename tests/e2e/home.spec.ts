import { expect, test } from '@playwright/test';

test('home page renders the project headline', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: /database-driven webinar questionnaire and knowledge progress system/i,
    }),
  ).toBeVisible();
});
