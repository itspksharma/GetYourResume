import { useState, useRef, useEffect } from 'react';
import {
  type ResumeVersion,
  type Profile,
  type AIAction,
  createVersion,
  tailorProfile,
  analyzeJob,
  profileSchema,
} from '@gyr/shared';
import { useWorkspace } from '@/lib/store';
import { ProfileEditor } from '@/features/profile/ProfileEditor';
import { JobAnalyzer } from '@/features/jobs/JobAnalyzer';
import { AIAssistant } from '@/features/ai/AIAssistant';
import { ResumePreview } from './ResumePreview';
import { ResumeBuilder } from './ResumeBuilder';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, FileCheck2 } from 'lucide-react';

export type WorkflowStage = 'details' | 'job' | 'writing' | 'design';
export const workflowSteps: [WorkflowStage, string, string][] = [
  ['details', 'Your details', 'Background and experience'],
  ['job', 'Target job', 'Fit and relevant evidence'],
  ['writing', 'AI & review', 'Draft and check your content'],
  ['design', 'Design & download', 'Layout, sections, and PDF'],
];
export function ResumeWorkflow({
  version,
  stage,
  onNavigate,
  onCreated,
}: {
  version?: ResumeVersion;
  stage: WorkflowStage;
  onNavigate: (stage: WorkflowStage) => void;
  onCreated: (id: string, stage: WorkflowStage) => void;
}) {
  const { data, setProfile, saveVersion, blocked } = useWorkspace();
  const profile = version?.profile || data.profile;
  const [notice, setNotice] = useState('');
  const [writerAction, setWriterAction] = useState<AIAction>(data.job ? 'tailor' : 'summary');
  const [confirmReview, setConfirmReview] = useState(false);
  const draft = useRef<Profile | null>(null);
  useEffect(() => {
    draft.current = null;
  }, [stage]);
  const currentProfile = () =>
    version
      ? useWorkspace.getState().data.versions.find((v) => v.id === version.id)?.profile || profile
      : useWorkspace.getState().data.profile;
  function saveProfile(p: Profile) {
    if (!version) return setProfile(p);
    const latest = useWorkspace.getState().data.versions.find((v) => v.id === version.id);
    return Boolean(
      latest && saveVersion({ ...latest, profile: p, updatedAt: new Date().toISOString() }),
    );
  }
  function ensure(next: WorkflowStage, job?: string, role?: string) {
    if (stage === 'details' && draft.current) {
      const parsed = profileSchema.safeParse(draft.current);
      if (!parsed.success) {
        setNotice(
          'Correct the invalid fields before continuing. Your saved details have been kept.',
        );
        return;
      }
      if (!saveProfile(parsed.data)) return;
    }
    const p = currentProfile();
    if (!p.personal.name.trim()) {
      setNotice('Enter your name in Your details before creating a resume.');
      onNavigate('details');
      return;
    }
    if (version) {
      if (job) {
        const latest = useWorkspace.getState().data.versions.find((v) => v.id === version.id);
        if (
          !latest ||
          !saveVersion({
            ...latest,
            profile: tailorProfile(p, job),
            role: role || latest.role,
            updatedAt: new Date().toISOString(),
          })
        )
          return;
        setWriterAction('tailor');
      }
      onNavigate(next);
    } else {
      const v = createVersion(job ? tailorProfile(p, job) : p, role || '');
      if (saveVersion(v)) {
        setWriterAction(job ? 'tailor' : 'summary');
        onCreated(v.id, next);
      }
    }
  }
  function accept(text: string, action: AIAction, target: string) {
    const p = structuredClone(currentProfile());
    if (['summary', 'tailor'].includes(action)) p.summary = text;
    else if (['tone', 'improve-bullets'].includes(action)) {
      let found = false;
      for (const kind of ['experience', 'internships', 'projects'] as const) {
        const entry = p[kind].find((e) => e.id === target);
        if (entry) {
          entry.description = text;
          found = true;
        }
      }
      if (!found) return false;
    } else return false;
    setConfirmReview(false);
    return saveProfile(p);
  }
  return (
    <>
      <div className="workflow-bar" aria-label="Resume building steps">
        {workflowSteps.map(([key, label, description], i) => (
          <button
            key={key}
            className={stage === key ? 'active' : ''}
            aria-current={stage === key ? 'step' : undefined}
            onClick={() => {
              if (key === 'details') onNavigate(key);
              else ensure(key);
            }}
          >
            <span className="step-indicator">
              {workflowSteps.findIndex((s) => s[0] === stage) > i ? <Check size={16} /> : i + 1}
            </span>
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="workflow-context">
        <span className="badge">
          {version ? 'Editing a saved resume' : 'Starting from your master details'}
        </span>
        <p>
          {version
            ? 'Changes apply to this resume only. Your reusable master details stay unchanged.'
            : 'Your details are reusable. Each resume you create will be saved as an independent version.'}
        </p>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {blocked ? (
        <div className="card">
          <p>Resolve the storage notice above before editing.</p>
        </div>
      ) : (
        <>
          {stage === 'details' && (
            <div className="card profile-card">
              <ProfileEditor
                key={version?.id || 'master'}
                profile={profile}
                onSave={saveProfile}
                onDraftChange={(p) => {
                  draft.current = p;
                }}
                onBuild={() => ensure('job')}
              />
            </div>
          )}
          {stage === 'job' && (
            <>
              <JobAnalyzer
                key={version?.id || 'master'}
                profile={profile}
                onTailor={(job, role) => ensure('writing', job, role)}
              />
              <div className="workflow-bottom">
                <Button variant="outline" onClick={() => onNavigate('details')}>
                  Back to details
                </Button>
                <Button onClick={() => ensure('writing')}>
                  {data.job ? 'Continue to AI & review' : 'Continue without a target job'}
                </Button>
              </div>
            </>
          )}
          {stage === 'writing' && (
            <>
              <div className="writing-layout">
                <section className="card stack">
                  <div>
                    <h2>
                      <Sparkles size={20} />
                      Write and refine your resume
                    </h2>
                    <p>
                      Use AI for a draft, improve a selected entry, or edit the content yourself.
                    </p>
                  </div>
                  <AIAssistant
                    key={`${version?.id || 'master'}-${writerAction}`}
                    profile={profile}
                    initialAction={writerAction}
                    onAccept={accept}
                  />
                  <div className="review-fields stack">
                    <h3>
                      <FileCheck2 size={19} />
                      Review your summary
                    </h3>
                    <label className="field">
                      Resume summary
                      <textarea
                        rows={6}
                        value={profile.summary}
                        maxLength={8000}
                        onChange={(e) => {
                          setConfirmReview(false);
                          saveProfile({ ...profile, summary: e.target.value });
                        }}
                      />
                    </label>
                    <Button variant="outline" onClick={() => onNavigate('details')}>
                      Edit all experience and details
                    </Button>
                  </div>
                  {data.job && (
                    <details>
                      <summary>Review job compatibility</summary>
                      <p>
                        {analyzeJob(data.job, profile).matched.join(', ') ||
                          'No recognized skill matches.'}
                      </p>
                      <p className="caption">
                        Estimated job compatibility — not an official ATS score or hiring
                        prediction.
                      </p>
                    </details>
                  )}
                </section>
                <aside className="preview-stage review-preview">
                  <div className="preview-label">
                    <span>YOUR CURRENT RESUME</span>
                  </div>
                  <ResumePreview version={version || createVersion(profile)} />
                </aside>
              </div>
              <div className="card review-confirm">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={confirmReview}
                    onChange={(e) => setConfirmReview(e.target.checked)}
                  />
                  <span>
                    I have reviewed the content and checked that the skills, employers, dates, and
                    achievements are accurate.
                  </span>
                </label>
                <Button disabled={!confirmReview} onClick={() => ensure('design')}>
                  Choose template & download
                </Button>
              </div>
            </>
          )}
          {stage === 'design' && version && <ResumeBuilder version={version} />}
        </>
      )}
    </>
  );
}
