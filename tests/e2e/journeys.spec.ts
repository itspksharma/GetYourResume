import { test, expect } from '@playwright/test';
test('guided profile, matching, tailoring, templates, print, and persistence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Let’s build your profile' }).click();
  await page.getByLabel('Full name', { exact: true }).fill('Taylor Rao');
  await page.getByLabel('Professional title', { exact: true }).fill('Frontend Developer');
  await page.getByLabel('Email address', { exact: true }).fill('taylor@example.com');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByLabel('Technical / professional skills').fill('React, TypeScript, HTML, CSS');
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
  await page.getByRole('button', { name: 'Build my resume' }).click();
  await expect(page.getByRole('article', { name: 'Resume preview' })).toContainText('Taylor Rao');
  await expect(page.locator('#resume-document')).toContainText('React Task Board');
  await page.getByRole('button', { name: /Modern Professional/ }).click();
  await expect(page.locator('#resume-document')).toHaveClass(/template-modern/);
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Summary', exact: true })
    .fill('Version-specific summary.');
  await expect(page.locator('#resume-document')).toContainText('Version-specific summary.');
  await page.getByRole('link', { name: 'Job Analyzer', exact: true }).click();
  await page
    .getByLabel('Target job description')
    .fill(
      'Job title: Frontend Engineer\nRequired: React, TypeScript.\nPreferred: Python.\nBachelor degree required.',
    );
  await page.getByRole('button', { name: 'Analyze job compatibility' }).click();
  await expect(
    page.getByText(
      'Estimated job compatibility score — not an official ATS score or hiring prediction.',
    ),
  ).toBeVisible();
  await expect(page.locator('.score-ring')).toContainText('80');
  await page.getByRole('button', { name: 'Create a tailored resume' }).click();
  await expect(page.getByLabel('Resume name')).toHaveValue('Frontend Engineer Resume');
  await expect(page.locator('#resume-document')).not.toContainText('Version-specific summary.');
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printCalled = 'yes';
    };
  });
  await page.getByRole('button', { name: 'Export PDF' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-print-called', 'yes');
  await page.reload();
  await expect(page.locator('#resume-document')).toContainText('Taylor Rao');
  await page.getByRole('link', { name: 'My Profile', exact: true }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Taylor Rao');
  await page.getByLabel('Full name', { exact: true }).fill('Taylor Kumar Rao');
  await expect(page.getByText('All changes saved on this device')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Taylor Kumar Rao');
  await page.getByRole('link', { name: 'AI Assistant AI', exact: true }).click();
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  await expect(page.getByRole('alert')).toContainText('AI assistance is temporarily unavailable.');
  await page.getByRole('button', { name: 'Use standard resume logic' }).click();
  await expect(
    page.getByText(
      'Assembled locally from your supplied facts using fixed rules. This is not AI-generated.',
    ),
  ).toBeVisible();
});
test('mobile navigation, theme, and JSON backup', async ({ page }) => {
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
test('corrupted storage is preserved and recoverable', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('getyourresume.workspace.v1', 'broken-data'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('It has not been overwritten');
  expect(await page.evaluate(() => localStorage.getItem('getyourresume.workspace.v1'))).toBe(
    'broken-data',
  );
});
