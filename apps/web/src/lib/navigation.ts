import type { WorkflowStage } from '@/features/resume/ResumeWorkflow';
export type Page = 'home' | 'builder' | 'resumes' | 'settings';
export function readRoute(hash: string): {
  page: Page;
  stage: WorkflowStage;
  resume: string | null;
  creator: boolean;
} {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const legacy: Record<string, WorkflowStage> = { profile: 'details', jobs: 'job', ai: 'writing' };
  const page: Page =
    Object.hasOwn(legacy, path) || path === 'builder'
      ? 'builder'
      : ['resumes', 'settings'].includes(path)
        ? (path as Page)
        : 'home';
  const requested = params.get('step');
  const stage: WorkflowStage = Object.hasOwn(legacy, path)
    ? legacy[path]
    : ['details', 'job', 'writing', 'design'].includes(requested || '')
      ? (requested as WorkflowStage)
      : path === 'builder'
        ? 'design'
        : 'details';
  return {
    page,
    stage,
    resume: path === 'profile' ? 'new' : params.get('resume'),
    creator: path === 'creator',
  };
}
export function builderLink(id: string | null, stage: WorkflowStage = 'details') {
  return `#builder?resume=${encodeURIComponent(id || 'new')}&step=${stage}`;
}
