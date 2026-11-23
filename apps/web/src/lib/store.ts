import { create } from 'zustand';
import {
  blankWorkspace,
  workspaceSchema,
  parseBackup,
  type Workspace,
  type Profile,
  type ResumeVersion,
} from '@gyr/shared';
export const STORAGE_KEY = 'getyourresume.workspace.v1';
type State = {
  data: Workspace;
  issue: string;
  blocked: boolean;
  raw: string | null;
  commit: (change: (data: Workspace) => Workspace) => boolean;
  setProfile: (profile: Profile) => boolean;
  saveVersion: (version: ResumeVersion) => boolean;
  removeVersion: (id: string) => void;
  importData: (raw: string) => void;
  reset: () => void;
  reload: () => void;
};
export function loadWorkspace(storage: Pick<Storage, 'getItem'>): {
  data: Workspace;
  issue: string;
  blocked: boolean;
  raw: string | null;
} {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    return { data: raw ? parseBackup(raw) : blankWorkspace(), issue: '', blocked: false, raw };
  } catch {
    return {
      data: blankWorkspace(),
      issue:
        'Saved data could not be read. It has not been overwritten. Download the original before restoring a backup or clearing storage.',
      blocked: true,
      raw,
    };
  }
}
export const useWorkspace = create<State>((set, get) => ({
  ...loadWorkspace(localStorage),
  commit(change) {
    if (get().blocked) return false;
    try {
      const data = workspaceSchema.parse(change(structuredClone(get().data)));
      const raw = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, raw);
      set({ data, raw, issue: '' });
      return true;
    } catch {
      set({
        issue:
          'Changes could not be saved. Storage may be full or disabled, or a field is too long. Export your data before leaving this page.',
      });
      return false;
    }
  },
  setProfile(profile) {
    return get().commit((data) => ({ ...data, profile }));
  },
  saveVersion(version) {
    return get().commit((data) => ({
      ...data,
      versions: [version, ...data.versions.filter((v) => v.id !== version.id)],
    }));
  },
  removeVersion(id) {
    get().commit((data) => ({ ...data, versions: data.versions.filter((v) => v.id !== id) }));
  },
  importData(raw) {
    const data = parseBackup(raw);
    // Preserve the old serialized workspace before any explicit restore.
    const old = localStorage.getItem(STORAGE_KEY);
    if (old) localStorage.setItem(`${STORAGE_KEY}.recovery`, old);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    set({ data, raw: JSON.stringify(data), issue: '', blocked: false });
  },
  reset() {
    const data = blankWorkspace();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}.recovery`);
    set({ data, raw: null, issue: '', blocked: false });
  },
  reload() {
    set(loadWorkspace(localStorage));
  },
}));
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && event.newValue !== useWorkspace.getState().raw)
    useWorkspace.setState({
      blocked: true,
      issue:
        'Your workspace changed in another tab. Reload the saved workspace to avoid overwriting it. Export this tab first if needed.',
    });
});
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportWorkspace() {
  download('GetYourResume-backup.json', JSON.stringify(useWorkspace.getState().data, null, 2));
}
