import { test, expect } from '@playwright/test';
import { mockAI, seedSample } from './helpers';
test('guided details, inline AI, target job, version review, and PDF download', async ({
  page,
}) => {
  test.setTimeout(60000);
  await mockAI(page);
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link'),
  ).toHaveText(['Home', 'Build Resume', 'My Resumes', 'Settings']);
  await page.getByRole('button', { name: 'Start building', exact: true }).click();
  await page.getByLabel('Full name', { exact: true }).fill('Taylor Rao');
  await page.getByLabel('Professional title', { exact: true }).fill('Frontend Developer');
  await page.getByLabel('Email address', { exact: true }).fill('taylor@example.com');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByLabel('Technical / professional skills').fill('React, TypeScript, HTML, CSS');
  await page.getByRole('button', { name: 'Draft summary' }).click();
  await page.getByRole('checkbox', { name: /I agree to send/ }).check();
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  await page.getByRole('button', { name: 'Accept suggestion' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Professional summary', exact: true }),
  ).toHaveValue('Frontend developer with React and TypeScript project experience.');
  await expect(
    page.getByRole('heading', { name: 'Professional summary and skills' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close writing help' }).click();
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('button', { name: 'Add entry' }).click();
  await page.getByLabel('Degree / qualification').fill('B.Tech Computer Science');
  await page.getByLabel('Institution').fill('Example College');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('button', { name: 'Add entry' }).click();
  await page.getByLabel('Title / role').fill('React Task Board');
  await page
    .getByLabel('Description / achievements')
    .fill('Built a React task board with TypeScript.');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('button', { name: 'Continue to target job' }).click();
  await page
    .getByLabel('Target job description')
    .fill(
      'Job title: Frontend Engineer\nRequired: React, TypeScript.\nPreferred: Python.\nBachelor degree required.',
    );
  await page.getByRole('button', { name: 'Analyze job compatibility' }).click();
  await expect(page.locator('.score-ring')).toContainText('80');
  await page.getByRole('button', { name: 'Create a tailored resume' }).click();
  await expect(page.getByRole('combobox', { name: 'What would you like help with?' })).toHaveValue(
    'tailor',
  );
  await page
    .getByRole('textbox', { name: 'Resume summary', exact: true })
    .fill('Version-specific summary.');
  await page.getByRole('checkbox', { name: /I have reviewed the content/ }).check();
  await page.getByRole('button', { name: 'Choose template & download' }).click();
  await page.getByRole('button', { name: /Modern Professional/ }).click();
  await expect(page.locator('#resume-document')).toHaveClass(/template-modern/);
  await expect(page.locator('#resume-document')).toContainText('Version-specific summary.');
  await expect(page.locator('#resume-document h1')).toHaveCSS('color', 'rgb(0, 0, 0)');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const pdf = await pending;
  expect(pdf.suggestedFilename()).toBe('My Resume.pdf');
  await page.reload();
  await expect(page.locator('#resume-document')).toContainText('Taylor Rao');
  await page.goto('/#profile');
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Taylor Rao');
  await page.getByRole('tab', { name: 'Your direction' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Professional summary', exact: true }),
  ).not.toHaveValue('Version-specific summary.');
});
test('mobile navigation, theme, and backup export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Dark theme' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my data' }).click();
  expect((await download).suggestedFilename()).toBe('GetYourResume-backup.json');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('corrupt storage and old saved versions remain recoverable', async ({ page }) => {
  await seedSample(page);
  await expect(page.locator('#resume-document')).toContainText('Alex Morgan');
  await page.evaluate(() => localStorage.setItem('getyourresume.workspace.v1', 'broken-data'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('It has not been overwritten');
  expect(await page.evaluate(() => localStorage.getItem('getyourresume.workspace.v1'))).toBe(
    'broken-data',
  );
});
test('AI outage preserves the guided standard path', async ({ page }) => {
  await mockAI(page);
  await page.route('https://api.getyourresume.test/**', (route) =>
    route.fulfill({
      status: route.request().method() === 'OPTIONS' ? 204 : 503,
      json: {
        error: {
          message:
            'AI assistance is temporarily unavailable. You can continue building and analyzing your resume using the free standard tools.',
        },
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    }),
  );
  await seedSample(page, '#builder?step=writing');
  await page.getByRole('checkbox', { name: /I agree to send/ }).check();
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  await expect(page.getByRole('alert')).toContainText('AI assistance is temporarily unavailable.');
  await page.getByRole('button', { name: 'Continue without AI' }).click();
  await page.getByRole('button', { name: 'Accept suggestion' }).click();
  await page.getByRole('checkbox', { name: /I have reviewed the content/ }).check();
  await page.getByRole('button', { name: 'Choose template & download' }).click();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeVisible();
});
test('workflow navigation flushes details before creating a version', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Full name', { exact: true }).fill('Last Moment Edit');
  await page.getByRole('button', { name: /Target job Fit/ }).click();
  const names = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('getyourresume.workspace.v1')!).versions.map(
      (v: { profile: { personal: { name: string } } }) => v.profile.personal.name,
    ),
  );
  expect(names).toEqual(['Last Moment Edit']);
});
