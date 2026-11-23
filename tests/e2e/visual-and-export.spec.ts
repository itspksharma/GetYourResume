import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { blankWorkspace, createVersion, blankEntry } from '../../packages/shared/src/index';
import { sampleProfile } from '../../packages/shared/src/sample';

test('visual captures, real multipage printing, and PDF import', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1060 });
  await page.goto('/');
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().right))
    .toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1060 });
  const profile = sampleProfile();
  profile.experience = Array.from({ length: 9 }, (_, i) => ({
    ...blankEntry(),
    title: `Demonstration Role ${i + 1}`,
    organization: 'Fictional Example Organization',
    start: '2025',
    end: '2026',
    description:
      'Built accessible React interfaces with TypeScript.\nCollaborated on a fictional training project.\nWrote component tests for the example application.\nDocumented project decisions and development workflows.',
  }));
  const workspace = {
    ...blankWorkspace(),
    profile,
    versions: [createVersion(profile)],
    sample: true,
  };
  await page.evaluate(
    (data) => localStorage.setItem('getyourresume.workspace.v1', JSON.stringify(data)),
    workspace,
  );
  await page.goto('/#builder');
  await page.reload();
  await expect(page.locator('#resume-document')).toContainText('Alex Morgan');
  await page.screenshot({ path: 'docs/screenshots/builder.png', fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.locator('#resume-document')).toBeVisible();
  const pdf = await page.pdf({
    path: 'test-results/fictional-resume.pdf',
    preferCSSPageSize: true,
    printBackground: true,
  });
  expect(pdf.byteLength).toBeGreaterThan(5000);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: new Uint8Array(pdf) });
  try {
    const printed = await loading.promise;
    expect(printed.numPages).toBeGreaterThan(1);
  } finally {
    await loading.destroy();
  }
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByRole('textbox', { name: /Extracted text/ })).toContainText('Alex Morgan', {
    timeout: 20000,
  });
  await expect(page.getByRole('textbox', { name: /Extracted text/ })).toContainText(
    'Demonstration Role 9',
  );
  expect(errors).toEqual([]);
});

test('JSON import is reviewed and restores independently', async ({ page }) => {
  await page.goto('/#settings');
  const p = sampleProfile();
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...blankWorkspace(), profile: p, sample: true })),
  });
  await expect(page.getByText('Backup preview')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Restore this backup' }).click();
  await expect(page.getByText('Backup restored successfully.')).toBeVisible();
  await page.getByRole('link', { name: 'My Profile', exact: true }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Alex Morgan');
});
