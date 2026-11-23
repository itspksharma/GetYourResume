import { it, expect } from 'vitest';
import { wrapText } from '../apps/web/src/features/resume/pdf-layout';
it('wraps measured words and preserves paragraph boundaries', () =>
  expect(wrapText('one two three\nfour', 7, (s) => s.length)).toEqual([
    'one two',
    'three',
    'four',
  ]));
it('splits long URLs without losing characters', () => {
  const s = 'https://example.com/verylongpath';
  const lines = wrapText(s, 8, (s) => s.length);
  expect(lines.every((s) => s.length <= 8)).toBe(true);
  expect(lines.join('')).toBe(s);
});
it('preserves Unicode code points when breaking long words', () => {
  expect(wrapText('JoséJosé', 4, (s) => [...s].length)).toEqual(['José', 'José']);
});
