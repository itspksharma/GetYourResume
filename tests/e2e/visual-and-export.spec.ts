import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { blankWorkspace, createVersion, blankEntry } from '../../packages/shared/src/index';
import { sampleProfile } from '../../packages/shared/src/sample';

test('visual captures and clean multipage PDF downloads for every template', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1060 });
  await page.goto('/');
  await expect
    .poll(() =>
      page
        .locator('.creator-avatar img')
        .evaluate((el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0),
    )
    .toBe(true);
  await page.locator('#creator').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('#creator img')
        .evaluate((el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0),
    )
    .toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  expect((await page.locator('body').innerText()).match(/Pawan Kumar Sharma/g)).toHaveLength(1);
  await expect(page.locator('#creator')).toContainText('Best of luck');
  const question = page.locator('.public-faq summary').first();
  await question.focus();
  await question.press('Enter');
  await expect(page.locator('.public-faq details').first()).toHaveAttribute('open', '');
  await question.press('Enter');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().right))
    .toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1060 });
  const p = sampleProfile();
  p.personal.name = 'Taylor José Rao';
  p.personal.github = 'https://github.com/example';
  p.experience = Array.from({ length: 9 }, (_, i) => ({
    ...blankEntry(),
    title: `Demonstration Role ${i + 1}`,
    organization: 'Fictional Example Organization',
    start: '2025',
    end: '2026',
    description:
      'Built accessible React interfaces with TypeScript.\nCollaborated on a fictional training project.\nWrote component tests for the example application.\nDocumented project decisions and development workflows.',
  }));
  const workspace = { ...blankWorkspace(), profile: p, versions: [createVersion(p)], sample: true };
  await page.evaluate(
    (data) => localStorage.setItem('getyourresume.workspace.v1', JSON.stringify(data)),
    workspace,
  );
  await page.goto('/#builder?step=design');
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/screenshots/builder.png', fullPage: true });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const [template, label] of [
    ['classic', 'ATS Classic'],
    ['modern', 'Modern Professional'],
    ['developer', 'Developer Portfolio'],
  ] as const) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await expect(page.locator('#resume-document h1')).toHaveCSS('color', 'rgb(0, 0, 0)');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const file = await downloading;
    const path = `test-results/${template}-resume.pdf`;
    await file.saveAs(path);
    const pdf = await readFile(path);
    expect(pdf.byteLength).toBeGreaterThan(5000);
    expect(pdf.toString('latin1')).toContain('/FontFile2');
    expect(pdf.toString('latin1')).not.toContain('/Subtype /Image');
    const task = getDocument({ data: new Uint8Array(pdf) });
    try {
      const doc = await task.promise;
      expect(doc.numPages).toBeGreaterThan(1);
      const first = await doc.getPage(1);
      expect(Math.round(first.view[2])).toBe(595);
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const pdfPage = await doc.getPage(i);
        const content = await pdfPage.getTextContent();
        const positions = new Map<number, number>();
        for (const item of content.items) {
          if (!('str' in item) || !item.str.trim()) continue;
          const x = Math.round(item.transform[4]);
          const y = item.transform[5];
          expect(y).toBeGreaterThanOrEqual(47);
          expect(y).toBeLessThanOrEqual(pdfPage.view[3] - 40);
          const previous = positions.get(x);
          if (previous !== undefined) expect(previous - y).toBeGreaterThan(7);
          positions.set(x, y);
        }
        text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      }
      expect(text).toContain('Taylor José Rao');
      expect(text).toContain('Demonstration Role 9');
      expect(text).toContain('2025');
      expect(text).toContain('github.com/example');
      expect(text).not.toContain('GetYourResume');
      expect(text).not.toContain('Pawan Kumar Sharma');
      expect(text).not.toContain('localhost');
    } finally {
      await task.destroy();
    }
  }
  await page.getByRole('combobox', { name: 'Paper size' }).selectOption('Letter');
  const letterDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const letter = await letterDownload;
  await letter.saveAs('test-results/letter-resume.pdf');
  const letterBytes = await readFile('test-results/letter-resume.pdf');
  const letterTask = getDocument({ data: new Uint8Array(letterBytes) });
  try {
    const doc = await letterTask.promise;
    const first = await doc.getPage(1);
    expect(first.view.slice(2)).toEqual([612, 792]);
  } finally {
    await letterTask.destroy();
  }
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Import and export/ }).click();
  await page.locator('input[type=file]').setInputFiles('test-results/modern-resume.pdf');
  await expect(page.getByRole('textbox', { name: /Extracted text/ })).toContainText(
    'Demonstration Role 9',
    { timeout: 20000 },
  );
  expect(errors).toEqual([]);
});
test('JSON restore requires review and retains creator identity separately', async ({ page }) => {
  await page.goto('/#settings');
  await page.getByRole('button', { name: /Import and export/ }).click();
  const p = sampleProfile();
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...blankWorkspace(), profile: p, sample: true })),
  });
  await expect(page.getByText('Backup preview')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Restore this backup' }).click();
  await expect(page.getByText('Backup restored successfully.')).toBeVisible();
  await page.goto('/#profile');
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Alex Morgan');
  await expect(page.locator('.header-brand')).toContainText('Pawan Kumar Sharma');
});
test('creator SEO content is present in initial HTML without private career data', async ({
  request,
}) => {
  const response = await request.get('/');
  const html = await response.text();
  expect(html).toContain('Pawan Kumar Sharma');
  expect(html).toMatch(/"jobTitle"\s*:\s*"Web Developer"/);
  expect(html).toContain('application/ld+json');
  expect(html).toContain('https://www.linkedin.com/in/itspksharma98/');
  expect(html).toContain('rel="canonical"');
  expect(html).not.toContain('Taylor Rao');
  expect((await request.get('/sitemap.xml')).ok()).toBe(true);
});
