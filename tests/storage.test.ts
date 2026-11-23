import { beforeEach, describe, it, expect, vi } from 'vitest';
import { blankWorkspace, blankProfile, createVersion } from '@gyr/shared';
import { useWorkspace, loadWorkspace, STORAGE_KEY } from '@/lib/store';
beforeEach(() => {
  localStorage.clear();
  useWorkspace.getState().reset();
});
describe('safe local persistence', () => {
  it('preserves corrupt bytes and blocks writes', () => {
    localStorage.setItem(STORAGE_KEY, 'broken-data');
    const loaded = loadWorkspace(localStorage);
    expect(loaded.blocked).toBe(true);
    expect(loaded.raw).toBe('broken-data');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken-data');
  });
  it('restores valid profile and versions', () => {
    const p = blankProfile();
    p.personal.name = 'Taylor';
    useWorkspace.getState().setProfile(p);
    useWorkspace.getState().saveVersion(createVersion(p));
    useWorkspace.getState().reload();
    expect(useWorkspace.getState().data.profile.personal.name).toBe('Taylor');
    expect(useWorkspace.getState().data.versions).toHaveLength(1);
  });
  it('updates versions in place and deletes without touching the master', () => {
    const p = blankProfile();
    p.personal.name = 'Taylor';
    useWorkspace.getState().setProfile(p);
    const v = createVersion(p);
    useWorkspace.getState().saveVersion(v);
    useWorkspace.getState().saveVersion({ ...v, name: 'Changed' });
    expect(useWorkspace.getState().data.versions).toHaveLength(1);
    useWorkspace.getState().removeVersion(v.id);
    expect(useWorkspace.getState().data.versions).toHaveLength(0);
    expect(useWorkspace.getState().data.profile.personal.name).toBe('Taylor');
  });
  it('keeps a recovery copy before replacing', () => {
    useWorkspace.getState().commit((d) => ({ ...d, job: 'original' }));
    useWorkspace.getState().importData(JSON.stringify(blankWorkspace()));
    expect(localStorage.getItem(STORAGE_KEY + '.recovery')).toContain('original');
  });
  it('refuses invalid imports without changing data', () => {
    useWorkspace.getState().commit((d) => ({ ...d, job: 'original' }));
    expect(() => useWorkspace.getState().importData('broken')).toThrow();
    expect(useWorkspace.getState().data.job).toBe('original');
  });
  it('handles quota errors without committing data loss', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota', 'QuotaExceededError');
    });
    expect(useWorkspace.getState().commit((d) => ({ ...d, job: 'not saved' }))).toBe(false);
    expect(useWorkspace.getState().data.job).toBe('');
    expect(useWorkspace.getState().issue).toContain('could not be saved');
    spy.mockRestore();
  });
  it('clears recovery copy as well as workspace', () => {
    localStorage.setItem(STORAGE_KEY + '.recovery', 'old');
    useWorkspace.getState().reset();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY + '.recovery')).toBeNull();
  });
});
