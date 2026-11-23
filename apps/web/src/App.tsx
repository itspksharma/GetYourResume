import { useEffect, useState } from 'react';
import {
  House,
  FilePenLine,
  Files,
  Settings,
  FileText,
  Plus,
  Moon,
  Sun,
  Menu,
  X,
  ShieldCheck,
  Copy,
  Trash2,
  Download,
  Upload,
  Sparkles,
  SearchCheck,
  ExternalLink,
  Check,
} from 'lucide-react';
import { completeness, duplicateVersion, improvements, type ResumeVersion } from '@gyr/shared';
import { sampleProfile } from '../../../packages/shared/src/sample';
import { useWorkspace, download, exportWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ImportPanel } from '@/features/profile/ImportPanel';
import { ResumeWorkflow } from '@/features/resume/ResumeWorkflow';
import { templates } from '@/features/resume/templates';
import { creator } from '@/lib/creator';
import { readRoute, builderLink } from '@/lib/navigation';

const nav = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'builder', label: 'Build Resume', icon: FilePenLine },
  { id: 'resumes', label: 'My Resumes', icon: Files },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;
export default function App() {
  const { data, issue, raw, commit, saveVersion, removeVersion, reset, reload } = useWorkspace();
  const [route, setRoute] = useState(() => readRoute(location.hash));
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState('');
  const [showImport, setShowImport] = useState(false);
  const active =
    route.resume === 'new'
      ? undefined
      : data.versions.find((v) => v.id === route.resume) ||
        (!route.resume ? data.versions[0] : undefined);
  const effectiveStage = !active && route.stage === 'design' ? 'details' : route.stage;
  useEffect(() => {
    const handler = () => {
      const next = readRoute(location.hash);
      setRoute(next);
      setMobile(false);
      if (next.creator)
        requestAnimationFrame(() =>
          document.getElementById('creator')?.scrollIntoView({ behavior: 'smooth' }),
        );
      else window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = data.theme;
    document.body.dataset.page = route.page;
  }, [data.theme, route.page]);
  const go = (hash: string) => {
    location.hash = hash;
    setMobile(false);
  };
  function sample() {
    if (
      (data.profile.personal.name || data.versions.length) &&
      !window.confirm(
        'Replace this workspace with fictional sample data? A recovery copy will be saved. Export a backup first.',
      )
    )
      return;
    try {
      useWorkspace.getState().importData(
        JSON.stringify({
          ...data,
          profile: sampleProfile(),
          versions: [],
          job: '',
          sample: true,
        }),
      );
      setNotice(
        'Fictional sample loaded. Enter your own details before using a resume for an application.',
      );
    } catch {
      setNotice('The sample could not be loaded. Existing data has been kept.');
    }
  }
  const progress = completeness(data.profile);
  const newResume = () => go(builderLink(null, 'details'));
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <a href="#home" className="brand">
          <span className="brand-mark">
            <FileText size={23} />
          </span>
          <span>
            GetYourResume<small>RESUME WORKSPACE</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <a
              key={item.id}
              href={
                item.id === 'builder'
                  ? builderLink(
                      active?.id || data.versions[0]?.id || null,
                      active || data.versions.length ? 'design' : 'details',
                    )
                  : `#${item.id}`
              }
              className={route.page === item.id ? 'active' : ''}
              aria-current={route.page === item.id ? 'page' : undefined}
            >
              <item.icon size={20} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini">
            <ShieldCheck size={20} />
            <strong>Saved on your device</strong>
            <p>No account is required. Export a backup to keep a copy.</p>
            <a href="#settings">Manage your data</a>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="actions">
            <Button
              className="mobile-menu"
              size="icon"
              variant="ghost"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </Button>
            <div className="header-brand">
              <strong>GetYourResume</strong>
              <span>By Pawan Kumar Sharma</span>
            </div>
          </div>
          <div className="actions">
            <span className="local-status">
              <ShieldCheck size={16} />
              Local workspace
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={data.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              onClick={() =>
                commit((d) => ({ ...d, theme: d.theme === 'light' ? 'dark' : 'light' }))
              }
            >
              {data.theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </Button>
            <a href="#creator" className="creator-avatar" aria-label="About Pawan Kumar Sharma">
              <img src={creator.photo} width="36" height="36" alt="" />
            </a>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {issue && (
            <div className="notice warning workspace-alert" role="alert">
              {issue}
              <div className="actions wrap mt">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    download(
                      'GetYourResume-recovery.txt',
                      raw || JSON.stringify(data),
                      'text/plain',
                    )
                  }
                >
                  Download original data
                </Button>
                <Button size="sm" variant="outline" onClick={reload}>
                  Reload saved workspace
                </Button>
                <Button size="sm" variant="outline" onClick={() => go('#settings')}>
                  Recovery settings
                </Button>
              </div>
            </div>
          )}
          {data.sample && (
            <div className="sample-notice">
              Fictional sample workspace. Replace the demonstration details before applying.{' '}
              <a href="#settings">Manage data</a>
            </div>
          )}
          {notice && (
            <div className="notice success-notice" role="status">
              <span>{notice}</span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                <X size={17} />
              </Button>
            </div>
          )}
          {route.page === 'home' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">PERSONAL RESUME WORKSPACE</span>
                  <h1>
                    {data.profile.personal.name
                      ? `Welcome back, ${data.profile.personal.name.split(' ')[0]}.`
                      : 'Build your next resume.'}
                  </h1>
                  <p>
                    Organize your experience, refine it with AI, and download a professional PDF.
                  </p>
                </div>
                <Button onClick={newResume}>
                  <Plus size={18} />
                  Create a resume
                </Button>
              </div>
              <div className="home-layout">
                <section className="card start-card">
                  <span className="badge">
                    <Sparkles size={15} />
                    AI-assisted resume builder
                  </span>
                  <h2>From your experience to a finished resume.</h2>
                  <p>
                    Follow a guided workflow with writing help where you need it. Review every
                    suggestion, choose a clean layout, and download your resume.
                  </p>
                  <div className="actions wrap">
                    <Button onClick={newResume}>
                      {progress ? 'Build from my details' : 'Start building'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowImport(true);
                        go('#settings');
                      }}
                    >
                      <Upload size={17} />
                      Import existing resume
                    </Button>
                  </div>
                  <div className="workflow-summary">
                    <span>
                      <FilePenLine size={18} />
                      Enter your details
                    </span>
                    <span>
                      <Sparkles size={18} />
                      Refine with AI
                    </span>
                    <span>
                      <Download size={18} />
                      Download PDF
                    </span>
                  </div>
                  <div className="standard-note">
                    <Check size={17} />
                    <span>If AI is unavailable, continue with the guided standard builder.</span>
                  </div>
                </section>
                <section className="card progress-panel">
                  <div className="section-line">
                    <h2>Workspace overview</h2>
                    <ShieldCheck size={20} />
                  </div>
                  <div className="overview-row">
                    <span>Master details</span>
                    <strong>{progress}% complete</strong>
                  </div>
                  <div
                    className="mini-progress"
                    aria-label={`Master details ${progress}% complete`}
                  >
                    <i style={{ width: `${progress}%` }} />
                  </div>
                  <div className="overview-row">
                    <span>Saved resumes</span>
                    <strong>{data.versions.length}</strong>
                  </div>
                  <div className="overview-row">
                    <span>Target job</span>
                    <strong>{data.job ? 'Saved for analysis' : 'Not added'}</strong>
                  </div>
                  <Button variant="outline" onClick={() => go(builderLink(null, 'details'))}>
                    Edit reusable details
                  </Button>
                </section>
              </div>
              <div className="dashboard-columns">
                <section className="card">
                  <div className="section-line">
                    <div>
                      <h2>Recent resumes</h2>
                      <p>Continue editing or create a version for another role.</p>
                    </div>
                    <a className="text-link" href="#resumes">
                      View all
                    </a>
                  </div>
                  {data.versions.length ? (
                    <div className="recent-list">
                      {data.versions.slice(0, 3).map((v) => (
                        <button
                          className="recent-item"
                          key={v.id}
                          onClick={() => go(builderLink(v.id, 'design'))}
                        >
                          <span className="file-icon">
                            <FileText size={23} />
                          </span>
                          <span>
                            <strong>{v.name}</strong>
                            <small>
                              {templates[v.template].name} · Updated{' '}
                              {new Date(v.updatedAt).toLocaleDateString()}
                            </small>
                          </span>
                          <span className="text-link">Open</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="collection-empty">
                      <FileText size={32} />
                      <h3>No saved resumes yet</h3>
                      <p>Complete the guided details to create your first version.</p>
                      <Button variant="outline" onClick={newResume}>
                        Create a resume
                      </Button>
                    </div>
                  )}
                </section>
                <section className="card">
                  <h2>Suggested next steps</h2>
                  <ul className="checklist">
                    {(improvements(data.profile).length
                      ? improvements(data.profile)
                      : ['Review your details and tailor a resume for the role you want.']
                    )
                      .slice(0, 3)
                      .map((s) => (
                        <li key={s}>
                          <span className="checklist-dot" />
                          {s}
                        </li>
                      ))}
                  </ul>
                  <div className="quick-action">
                    <SearchCheck size={20} />
                    <div>
                      <strong>Compare with a target job</strong>
                      <p>Get an explained estimate of skill alignment.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        go(builderLink(active?.id || data.versions[0]?.id || null, 'job'))
                      }
                    >
                      Analyze
                    </Button>
                  </div>
                </section>
              </div>
              <section className="sample-card">
                <div>
                  <h3>Try the workflow with sample data</h3>
                  <p>The demonstration profile is fictional and clearly labeled.</p>
                </div>
                <Button variant="outline" onClick={sample}>
                  Load sample profile
                </Button>
              </section>
            </>
          )}
          {route.page === 'builder' && (
            <>
              <PageHeading
                title="Build your resume"
                description="Complete your details, use AI to refine the wording, then review and download."
              />
              {route.resume && route.resume !== 'new' && !active ? (
                <div className="card stack">
                  <h2>This saved version is no longer available</h2>
                  <p>Your other versions and master details are still available.</p>
                  <Button onClick={newResume}>Start a new resume</Button>
                </div>
              ) : (
                <ResumeWorkflow
                  key={active?.id || 'new'}
                  version={active}
                  stage={effectiveStage}
                  onNavigate={(step) => go(builderLink(active?.id || null, step))}
                  onCreated={(id, step) => go(builderLink(id, step))}
                />
              )}
            </>
          )}
          {route.page === 'resumes' && (
            <>
              <PageHeading
                title="My resumes"
                description="Independent versions for different roles. Editing a version does not change your master details."
                action={
                  <Button onClick={newResume}>
                    <Plus size={18} />
                    New resume
                  </Button>
                }
              />
              {data.versions.length ? (
                <div className="resume-grid">
                  {data.versions.map((v) => (
                    <ResumeCard
                      key={v.id}
                      version={v}
                      onEdit={() => go(builderLink(v.id, 'design'))}
                      onDuplicate={() => {
                        if (saveVersion(duplicateVersion(v)))
                          setNotice(
                            'Resume duplicated. Edit its name or tailor it for another application.',
                          );
                      }}
                      onDelete={() => {
                        if (
                          window.confirm(`Delete “${v.name}”? Your master details will stay saved.`)
                        )
                          removeVersion(v.id);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="card full-empty">
                  <Files size={36} />
                  <h2>No saved resumes yet</h2>
                  <p>
                    Build a resume from your details, then save separate versions for each
                    application.
                  </p>
                  <Button onClick={newResume}>Create a resume</Button>
                </div>
              )}
            </>
          )}
          {route.page === 'settings' && (
            <>
              <PageHeading
                title="Settings"
                description="Manage appearance, AI access, backups, and the information stored on this device."
              />
              <div className="settings-grid">
                <div className="stack">
                  <section className="card">
                    <h2>Preferences</h2>
                    <div className="setting-row">
                      <div>
                        <strong>Dark theme</strong>
                        <p>Use a darker workspace. Resumes remain black on white.</p>
                      </div>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label="Dark theme"
                        checked={data.theme === 'dark'}
                        onChange={(e) =>
                          commit((d) => ({ ...d, theme: e.target.checked ? 'dark' : 'light' }))
                        }
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <strong>AI assistance</strong>
                        <p>Allow manual writing requests to the Cloudflare service.</p>
                      </div>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label="AI assistance"
                        checked={data.aiEnabled}
                        onChange={(e) => commit((d) => ({ ...d, aiEnabled: e.target.checked }))}
                      />
                    </div>
                    <p className="notice mt">
                      {import.meta.env.VITE_API_URL
                        ? 'An AI service is configured. Requests need your consent and successful human verification.'
                        : 'AI is not connected in this build. The standard guided workflow remains available.'}
                    </p>
                  </section>
                  <section className="card" id="import-tools">
                    <button
                      className="section-toggle"
                      onClick={() => setShowImport(!showImport)}
                      aria-expanded={showImport}
                    >
                      <h2>Import and export</h2>
                      <span>{showImport ? 'Hide' : 'Open'}</span>
                    </button>
                    {showImport ? (
                      <div className="mt">
                        <ImportPanel />
                      </div>
                    ) : (
                      <p className="mt">
                        Restore JSON backups or extract text from PDF and DOCX files.
                      </p>
                    )}
                  </section>
                </div>
                <div className="stack">
                  <section className="card privacy-card">
                    <ShieldCheck size={27} />
                    <h2>Your data and privacy</h2>
                    <p>
                      Career details, resumes, and jobs are kept in this browser’s localStorage.
                      There is no account or remote resume database.
                    </p>
                    <p>
                      Browser storage is not encrypted and can be lost if browser data is cleared.
                      Download backups regularly.
                    </p>
                    <p>
                      Only facts you review and relevant job text are sent to Cloudflare when you
                      request AI. Human verification also contacts Cloudflare. No analytics or
                      advertising trackers are included.
                    </p>
                    <Button variant="outline" onClick={exportWorkspace}>
                      <Download size={17} />
                      Download my data
                    </Button>
                  </section>
                  <section className="card danger-zone">
                    <h2>Delete local data</h2>
                    <p>
                      This deletes master details, resumes, jobs, preferences, and the recovery copy
                      in this browser. Export a backup first.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Permanently clear all GetYourResume data in this browser, including the recovery copy?',
                          )
                        ) {
                          try {
                            reset();
                            setNotice('Local workspace cleared.');
                          } catch {
                            setNotice(
                              'Unable to clear browser storage. Check browser permissions.',
                            );
                          }
                        }
                      }}
                    >
                      <Trash2 size={17} />
                      Delete local data
                    </Button>
                  </section>
                </div>
              </div>
            </>
          )}
          <footer className="app-footer">
            <span>GetYourResume · Your personal resume workspace</span>
            <div className="actions">
              <a href="#creator">A note from the creator</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function ResumeCard({
  version: v,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  version: ResumeVersion;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="card version-card">
      <div className="version-heading">
        <FileText size={27} />
        <span className="badge">{v.paper}</span>
      </div>
      <h2>{v.name}</h2>
      <p>{[v.role, v.company].filter(Boolean).join(' · ') || 'General professional resume'}</p>
      <p className="caption">
        {templates[v.template].name} · Updated {new Date(v.updatedAt).toLocaleDateString()}
      </p>
      <div className="actions">
        <Button onClick={onEdit}>
          Open resume
          <ExternalLink size={15} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Duplicate ${v.name}`}
          onClick={onDuplicate}
        >
          <Copy size={17} />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Delete ${v.name}`} onClick={onDelete}>
          <Trash2 size={17} />
        </Button>
      </div>
    </section>
  );
}
