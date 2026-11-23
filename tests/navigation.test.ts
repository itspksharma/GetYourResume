import { it, expect } from 'vitest';
import { readRoute, builderLink } from '@/lib/navigation';
it('preserves legacy links while exposing one builder navigation item', () => {
  expect(readRoute('#profile')).toMatchObject({ page: 'builder', stage: 'details', resume: 'new' });
  expect(readRoute('#jobs')).toMatchObject({ page: 'builder', stage: 'job' });
  expect(readRoute('#ai')).toMatchObject({ page: 'builder', stage: 'writing' });
  expect(readRoute('#dashboard').page).toBe('home');
});
it('restores a selected resume and step from the URL', () =>
  expect(readRoute(builderLink('version-1', 'writing'))).toMatchObject({
    page: 'builder',
    stage: 'writing',
    resume: 'version-1',
  }));
it('unknown routes and inherited object keys resolve safely', () =>
  expect(readRoute('#toString').page).toBe('home'));
