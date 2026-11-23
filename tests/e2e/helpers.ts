import { type Page } from '@playwright/test';
import { blankWorkspace, createVersion } from '../../packages/shared/src/index';
import { sampleProfile } from '../../packages/shared/src/sample';
export async function mockAI(
  page: Page,
  text = 'Frontend developer with React and TypeScript project experience.',
) {
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.turnstile={render:function(el,options){el.textContent='Test verification complete';window.__testVerification=options;queueMicrotask(()=>options.callback('test-token'));return 'test-widget';},remove:function(){},reset:function(){queueMicrotask(()=>window.__testVerification.callback('test-token'));}};`,
    }),
  );
  await page.route('https://api.getyourresume.test/**', (route) =>
    route.fulfill({
      status: route.request().method() === 'OPTIONS' ? 204 : 200,
      json: { suggestion: { text, notes: ['Test fixture: review this suggestion.'] } },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    }),
  );
}
export async function seedSample(page: Page, hash = '#builder?step=design') {
  await page.goto('/');
  const profile = sampleProfile();
  const v = createVersion(profile);
  await page.evaluate(
    (data) => localStorage.setItem('getyourresume.workspace.v1', JSON.stringify(data)),
    { ...blankWorkspace(), profile, versions: [v], sample: true },
  );
  await page.goto(`/${hash}`);
  await page.reload();
  return v;
}
