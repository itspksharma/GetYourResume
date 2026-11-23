import { it, expect } from 'vitest';
import { normalizeBasePath } from '../apps/web/base-path';
it('preserves the root and adds exactly the required trailing slash', () => {
  expect(normalizeBasePath(undefined)).toBe('/');
  expect(normalizeBasePath('/')).toBe('/');
  expect(normalizeBasePath('/GetYourResume')).toBe('/GetYourResume/');
  expect(normalizeBasePath('/GetYourResume/')).toBe('/GetYourResume/');
});
it('resolves portrait and PDF font paths under a project base', () => {
  const base = normalizeBasePath('/GetYourResume');
  expect(`${base}pawan-kumar-sharma.jpg`).toBe('/GetYourResume/pawan-kumar-sharma.jpg');
  expect(`${base}fonts/LiberationSans-Regular.ttf`).toBe(
    '/GetYourResume/fonts/LiberationSans-Regular.ttf',
  );
});
