import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  UserRound,
  FilePenLine,
  ScanSearch,
  Sparkles,
  Files,
  Settings,
  FileText,
  Plus,
  Moon,
  Sun,
  Menu,
  X,
  ShieldCheck,
  Check,
  Layers3,
  Copy,
  Trash2,
  FolderOpen,
  CircleHelp,
  WandSparkles,
  BriefcaseBusiness,
  Download,
  ChevronRight,
} from 'lucide-react';
import {
  completeness,
  createVersion,
  duplicateVersion,
  improvements,
  tailorProfile,
  profileSchema,
  type AIAction,
} from '@gyr/shared';
import { sampleProfile } from '../../../packages/shared/src/sample';
import { useWorkspace, download, exportWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProfileEditor } from '@/features/profile/ProfileEditor';
import { ImportPanel } from '@/features/profile/ImportPanel';
import { ResumeBuilder, templates } from '@/features/resume/ResumeBuilder';
import { JobAnalyzer } from '@/features/jobs/JobAnalyzer';
import { AIAssistant } from '@/features/ai/AIAssistant';

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'builder', label: 'Resume Builder', icon: FilePenLine },
  { id: 'jobs', label: 'Job Analyzer', icon: ScanSearch },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'resumes', label: 'My Resumes', icon: Files },
  { id: 'settings', label: 'Settings', icon: Settings },
];
function route() {
  const id = location.hash.slice(1);
  return nav.some((n) => n.id === id) ? id : 'dashboard';
}
export default function App() {
  const {
    data,
    issue,
    blocked,
    raw,
    commit,
    setProfile,
    saveVersion,
    removeVersion,
    reset,
    reload,
  } = useWorkspace();
  const [page, setPage] = useState(route);
  const [mobile, setMobile] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [profileKey, setProfileKey] = useState(0);
  const active = data.versions.find((v) => v.id === activeId) || data.versions[0];
  useEffect(() => {
    const handler = () => {
      setPage(route());
      setMobile(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = data.theme;
  }, [data.theme]);
  const go = (id: string) => {
    location.hash = id;
    setMobile(false);
  };
  function build(job = '', role = '') {
    if (blocked) return;
    const current = useWorkspace.getState().data;
    if (!current.profile.personal.name.trim()) {
      setNotice('Start with your name, then add your experience. We’ll guide you through it.');
      go('profile');
      return;
    }
    const version = createVersion(
      job ? tailorProfile(current.profile, job) : current.profile,
      role,
    );
    if (saveVersion(version)) {
      setActiveId(version.id);
      setNotice(
        'Your resume is ready from your supplied facts. Use the AI tab to refine it when the service is connected.',
      );
      go('builder');
    }
  }
  function accept(text: string, action: AIAction, target: string) {
    if (['analyze', 'interview'].includes(action)) {
      download(`GetYourResume-${action}.txt`, text, 'text/plain');
      return true;
    }
    const p = structuredClone(data.profile);
    if (action === 'improve-bullets' || action === 'tone') {
      for (const key of ['experience', 'internships', 'projects'] as const) {
        const entry = p[key].find((e) => e.id === target);
        if (entry) entry.description = text;
      }
    } else p.summary = text;
    const checked = profileSchema.safeParse(p);
    if (checked.success && setProfile(checked.data)) {
      setProfileKey((k) => k + 1);
      setNotice('Suggestion accepted into your master profile. Saved resumes stay separate.');
      return true;
    }
    return false;
  }
  const progress = completeness(data.profile);
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
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <a href="#dashboard" className="brand">
          <span className="brand-mark">
            <FileText size={23} />
          </span>
          <span>
            GetYour<span className="brand-accent">Resume</span>
            <small>YOUR NEXT CHAPTER</small>
          </span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <a
              href={`#${n.id}`}
              key={n.id}
              aria-current={page === n.id ? 'page' : undefined}
              className={page === n.id ? 'active' : ''}
              onClick={() => setMobile(false)}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === 'ai' && <span className="nav-tag">AI</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini">
            <ShieldCheck size={20} />
            <strong>Your story stays yours.</strong>
            <p>Your workspace lives in this browser. No account needed.</p>
            <a href="#settings">Privacy & data</a>
          </div>
          <div className="sidebar-user">
            <span className="avatar">
              {data.profile.personal.name
                ? data.profile.personal.name
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'YO'}
            </span>
            <div>
              <strong>{data.profile.personal.name || 'Your workspace'}</strong>
              <small>Personal resume studio</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="actions">
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={21} />
            </Button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={14} />
              <strong>{nav.find((n) => n.id === page)?.label}</strong>
            </span>
          </div>
          <div className="actions">
            <span className="local-status">
              <ShieldCheck size={14} />
              Stored on your device
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={data.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              onClick={() =>
                commit((d) => ({ ...d, theme: d.theme === 'light' ? 'dark' : 'light' }))
              }
            >
              {data.theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </Button>
            <span className="top-avatar">{data.profile.personal.name?.[0] || 'Y'}</span>
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
                <Button size="sm" variant="outline" onClick={() => go('settings')}>
                  Open recovery settings
                </Button>
              </div>
            </div>
          )}
          {data.sample && (
            <div className="sample-notice">
              Fictional sample workspace · Alex Morgan is demonstration data.{' '}
              <button onClick={() => go('settings')}>Manage sample data</button>
            </div>
          )}
          {notice && (
            <div className="notice success-notice" role="status">
              <span>{notice}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                <X size={16} />
              </Button>
            </div>
          )}
          {page === 'dashboard' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">A LITTLE CLARITY. A LOT OF POSSIBILITY.</div>
                  <h1>
                    {data.profile.personal.name
                      ? `Welcome back, ${data.profile.personal.name.split(' ')[0]}.`
                      : 'Your next chapter starts here.'}
                  </h1>
                  <p>Turn what you’ve done into what comes next.</p>
                </div>
                <Button onClick={() => build()}>
                  <Plus size={17} />
                  Create a resume
                </Button>
              </div>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <Sparkles size={15} />
                    YOUR EXPERIENCE. BEAUTIFULLY PRESENTED.
                  </span>
                  <h2>
                    A resume that feels
                    <br />
                    like <span>you, at your best.</span>
                  </h2>
                  <p>
                    Tell us your story. We’ll help shape it into a clear, confident resume — ready
                    for your next opportunity.
                  </p>
                  <div className="actions wrap">
                    <Button onClick={() => go('profile')}>
                      {progress ? 'Continue my profile' : 'Let’s build your profile'}
                      <FilePenLine size={16} />
                    </Button>
                    <Button
                      className="hero-secondary"
                      variant="ghost"
                      onClick={() => {
                        setShowImport(true);
                        go('profile');
                      }}
                    >
                      Import an existing resume
                    </Button>
                  </div>
                  <div className="hero-assurances">
                    <span>
                      <Check size={14} />
                      Free standard tools
                    </span>
                    <span>
                      <Check size={14} />
                      No account required
                    </span>
                    <span>
                      <Check size={14} />
                      AI when available
                    </span>
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="art-orbit" />
                  <div className="art-resume">
                    <div className="art-monogram">{data.profile.personal.name?.[0] || 'Y'}</div>
                    <div className="art-name" />
                    <div className="art-subtitle" />
                    <div className="art-divider" />
                    {[0, 1, 2].map((i) => (
                      <div className="art-section" key={i}>
                        <b />
                        <i />
                        <i />
                        <i />
                      </div>
                    ))}
                  </div>
                  <div className="art-badge">
                    <ShieldCheck size={19} />
                    <span>
                      Built around
                      <br />
                      <strong>your real experience</strong>
                    </span>
                  </div>
                  <span className="art-sparkle">✦</span>
                </div>
              </section>
              <div className="stats-grid">
                <Card className="stat-card">
                  <span className="stat-icon violet">
                    <UserRound size={22} />
                  </span>
                  <div>
                    <p>Profile completeness</p>
                    <strong>
                      {progress}
                      <small>%</small>
                    </strong>
                    <div className="mini-progress">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <button aria-label="Complete your profile" onClick={() => go('profile')}>
                    <ChevronRight size={20} />
                  </button>
                </Card>
                <Card className="stat-card">
                  <span className="stat-icon blue">
                    <Files size={22} />
                  </span>
                  <div>
                    <p>Saved resumes</p>
                    <strong>{data.versions.length.toString().padStart(2, '0')}</strong>
                    <small>Each one, a new possibility</small>
                  </div>
                </Card>
                <Card className="stat-card">
                  <span className="stat-icon green">
                    <ScanSearch size={22} />
                  </span>
                  <div>
                    <p>Last analyzed job</p>
                    <strong className="stat-text">
                      {data.job ? 'Ready to revisit' : 'Your next match'}
                    </strong>
                    <button className="text-link" onClick={() => go('jobs')}>
                      {data.job ? 'View your analysis' : 'Find how your skills connect'}
                    </button>
                  </div>
                </Card>
              </div>
              <div className="dashboard-columns">
                <section className="card">
                  <div className="section-line">
                    <div>
                      <h2>Your resume collection</h2>
                      <p>A different role deserves a different story.</p>
                    </div>
                    <button className="text-link" onClick={() => go('resumes')}>
                      View all
                    </button>
                  </div>
                  {data.versions.length ? (
                    <div className="recent-list">
                      {data.versions.slice(0, 3).map((v) => (
                        <button
                          key={v.id}
                          className="recent-item"
                          onClick={() => {
                            setActiveId(v.id);
                            go('builder');
                          }}
                        >
                          <span className="file-icon">
                            <FileText size={24} />
                          </span>
                          <span>
                            <strong>{v.name}</strong>
                            <small>
                              {templates[v.template].name} ·{' '}
                              {new Date(v.updatedAt).toLocaleDateString()}
                            </small>
                          </span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="collection-empty">
                      <span className="empty-file">
                        <FileText size={34} />
                        <Plus size={15} />
                      </span>
                      <h3>Your first resume belongs here.</h3>
                      <p>Start with a few details. Build something you’re proud to send.</p>
                      <Button variant="outline" onClick={() => build()}>
                        <Plus size={16} />
                        Create my first resume
                      </Button>
                    </div>
                  )}
                </section>
                <section className="card next-steps">
                  <span className="eyebrow">SMALL STEPS, STRONGER STORY</span>
                  <h2>Make your next move.</h2>
                  {[
                    {
                      title: 'Bring your profile to life',
                      text: 'Your skills, projects, and experience in one place.',
                      icon: UserRound,
                      page: 'profile',
                    },
                    {
                      title: 'Find the fit',
                      text: 'See how your story connects to a job.',
                      icon: ScanSearch,
                      page: 'jobs',
                    },
                    {
                      title: 'Find the right words',
                      text: 'AI writing help, with you in control.',
                      icon: Sparkles,
                      page: 'ai',
                    },
                  ].map((item) => (
                    <button className="next-step" key={item.title} onClick={() => go(item.page)}>
                      <span className="step-icon">
                        <item.icon size={19} />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.text}</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                </section>
              </div>
              <div className="dashboard-columns bottom-columns">
                <section className="card">
                  <div className="section-line">
                    <h3>
                      <WandSparkles size={18} />A little room to grow
                    </h3>
                    <span className="badge">Based on your profile</span>
                  </div>
                  <ul className="checklist">
                    {(improvements(data.profile).length
                      ? improvements(data.profile)
                      : [
                          'Your core profile is complete. Review your facts and tailor a version for your next application.',
                        ]
                    )
                      .slice(0, 3)
                      .map((s) => (
                        <li key={s}>
                          <span />
                          <span>{s}</span>
                        </li>
                      ))}
                  </ul>
                </section>
                <section className="sample-card">
                  <span className="icon-tile">
                    <FolderOpen size={21} />
                  </span>
                  <div>
                    <h3>Just looking around?</h3>
                    <p>Explore with a clearly labeled fictional sample.</p>
                    <button
                      className="text-link"
                      onClick={() => {
                        if (data.profile.personal.name || data.versions.length) {
                          if (
                            !window.confirm(
                              'Replace this workspace with fictional sample data? A recovery copy will be saved. Export a backup first.',
                            )
                          )
                            return;
                        }
                        try {
                          useWorkspace
                            .getState()
                            .importData(
                              JSON.stringify({
                                ...data,
                                profile: sampleProfile(),
                                versions: [],
                                job: '',
                                sample: true,
                              }),
                            );
                          setProfileKey((k) => k + 1);
                          setNotice(
                            'Fictional sample loaded. Replace these details with your own before applying.',
                          );
                        } catch {
                          setNotice('Sample could not be loaded. Your data has been kept.');
                        }
                      }}
                    >
                      Explore sample workspace
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}
          {page === 'profile' && (
            <>
              <PageHeading
                eyebrow="THE FOUNDATION OF EVERY RESUME"
                title="Your story, in one place."
                description="Answer a few focused questions. We’ll turn your details into a resume you can make your own."
              />
              <div className="profile-top">
                <span className="badge">
                  <ShieldCheck size={14} />
                  Saved on this device
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
                  {showImport ? 'Close import tools' : 'Import / export'}
                </Button>
              </div>
              {showImport && (
                <div className="card import-panel">
                  <ImportPanel />
                </div>
              )}
              <div className="card profile-card">
                {!blocked ? (
                  <ProfileEditor
                    key={profileKey}
                    profile={data.profile}
                    onSave={setProfile}
                    onBuild={() => build()}
                  />
                ) : (
                  <p>Resolve the storage issue above before editing.</p>
                )}
              </div>
            </>
          )}
          {page === 'builder' && (
            <>
              <PageHeading
                eyebrow="GIVE YOUR EXPERIENCE A LITTLE STRUCTURE"
                title="Your resume, your way."
                description="Shape the details, choose a template, and make your next impression."
              />
              {active ? (
                <ResumeBuilder key={active.id} version={active} />
              ) : (
                <Empty
                  icon={FilePenLine}
                  title="Let’s make your first resume."
                  text="Start with your profile. The guided questions help you collect the details, and we’ll assemble them into a professional layout."
                  button="Start building"
                  onClick={() => build()}
                />
              )}
            </>
          )}
          {page === 'jobs' && (
            <>
              <PageHeading
                eyebrow="LESS GUESSWORK. MORE DIRECTION."
                title="Find the connection."
                description="Understand the fit before you hit apply. Clear evidence, honest gaps, and practical next steps."
              />
              <JobAnalyzer profile={data.profile} onTailor={build} />
            </>
          )}
          {page === 'ai' && (
            <>
              <PageHeading
                eyebrow="YOUR WRITING PARTNER"
                title="Good experience. Better words."
                description="AI helps you express what you’ve done. You decide what makes it onto your resume."
              />
              <div className="card ai-page">
                <AIAssistant profile={data.profile} onAccept={accept} />
              </div>
            </>
          )}
          {page === 'resumes' && (
            <>
              <PageHeading
                eyebrow="READY FOR YOUR NEXT OPPORTUNITY"
                title="Your resume collection."
                description="One master profile. A considered version for every role."
                action={
                  <Button onClick={() => build()}>
                    <Plus size={17} />
                    New resume
                  </Button>
                }
              />
              {data.versions.length ? (
                <div className="resume-grid">
                  {data.versions.map((v) => (
                    <Card key={v.id} className="version-card">
                      <div
                        className={`version-illustration illustration-${v.template}`}
                        aria-hidden="true"
                      >
                        <div>
                          <b />
                          {Array.from({ length: 8 }, (_, i) => (
                            <i key={i} />
                          ))}
                        </div>
                      </div>
                      <div className="version-info">
                        <span className="badge">{templates[v.template].name}</span>
                        <h2>{v.name}</h2>
                        <p>
                          {[v.role, v.company].filter(Boolean).join(' · ') ||
                            'General professional resume'}
                        </p>
                        <small>Updated {new Date(v.updatedAt).toLocaleString()}</small>
                        <div className="actions">
                          <Button
                            onClick={() => {
                              setActiveId(v.id);
                              go('builder');
                            }}
                          >
                            Edit resume
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Duplicate ${v.name}`}
                            onClick={() => saveVersion(duplicateVersion(v))}
                          >
                            <Copy size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${v.name}`}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete “${v.name}”? Your master profile will stay saved.`,
                                )
                              )
                                removeVersion(v.id);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Files}
                  title="A fresh start for your next role."
                  text="Create a resume from your profile, then duplicate and tailor it for each opportunity."
                  button="Create a resume"
                  onClick={() => build()}
                />
              )}
            </>
          )}
          {page === 'settings' && (
            <>
              <PageHeading
                eyebrow="YOUR WORKSPACE. YOUR CHOICES."
                title="Make yourself at home."
                description="Manage your preferences, privacy, and the data you keep on this device."
              />
              <div className="settings-grid">
                <div className="stack">
                  <Card>
                    <h2>Appearance & AI</h2>
                    <div className="setting-row">
                      <div>
                        <strong>Dark theme</strong>
                        <p>Choose the view that feels comfortable.</p>
                      </div>
                      <input
                        aria-label="Dark theme"
                        type="checkbox"
                        role="switch"
                        checked={data.theme === 'dark'}
                        onChange={(e) =>
                          commit((d) => ({ ...d, theme: e.target.checked ? 'dark' : 'light' }))
                        }
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <strong>AI assistance</strong>
                        <p>Enable manual requests to the configured Cloudflare service.</p>
                      </div>
                      <input
                        aria-label="AI assistance"
                        type="checkbox"
                        role="switch"
                        checked={data.aiEnabled}
                        onChange={(e) => commit((d) => ({ ...d, aiEnabled: e.target.checked }))}
                      />
                    </div>
                    <p className="notice">
                      {import.meta.env.VITE_API_URL
                        ? 'An AI endpoint is configured. Availability depends on its setup and free allocation.'
                        : 'AI is not connected yet. The guided builder and job analyzer are ready without it.'}
                    </p>
                  </Card>
                  <Card>
                    <ImportPanel />
                  </Card>
                </div>
                <div className="stack">
                  <Card className="privacy-card">
                    <ShieldCheck size={28} />
                    <h2>Private by design.</h2>
                    <p>
                      Your master profile, jobs, and resumes stay in this browser’s localStorage. No
                      account or database is used.
                    </p>
                    <p>
                      localStorage is not encrypted. Other people using this browser, browser
                      extensions, or scripts on the same origin may be able to access it. Clearing
                      browser data can remove your workspace.
                    </p>
                    <p>
                      Only reviewed facts and relevant job text are sent to Cloudflare when you
                      explicitly request AI. Enabling human verification contacts Cloudflare. There
                      are no analytics or advertising trackers.
                    </p>
                    <Button variant="outline" onClick={exportWorkspace}>
                      <Download size={16} />
                      Download my data
                    </Button>
                  </Card>
                  <Card className="danger-zone">
                    <h3>Clear this device’s data</h3>
                    <p>
                      Deletes the master profile, resumes, jobs, preferences, and recovery copy
                      stored by this app. Export a backup before continuing.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Permanently clear all GetYourResume data in this browser? This includes your recovery copy.',
                          )
                        ) {
                          try {
                            reset();
                            setActiveId(null);
                            setProfileKey((k) => k + 1);
                            setNotice('Local workspace cleared.');
                          } catch {
                            setNotice(
                              'Browser storage could not be cleared. Check your browser permissions.',
                            );
                          }
                        }
                      }}
                    >
                      <Trash2 size={16} />
                      Delete local data
                    </Button>
                  </Card>
                  <Card>
                    <h3>
                      <CircleHelp size={18} />A few honest limits
                    </h3>
                    <p>
                      Compatibility is an estimate based on skill evidence, not an ATS score. PDF
                      pagination can vary by browser. AI has a shared free allowance and can make
                      factual mistakes.
                    </p>
                    <p>Your resume is always yours to review.</p>
                  </Card>
                </div>
              </div>
            </>
          )}
          <footer className="app-footer">
            <span>
              GetYourResume <span className="footer-separator">/</span> Made for your next chapter.
            </span>
            <span>
              <BriefcaseBusiness size={13} />
              Real experience. Thoughtfully presented.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  button,
  onClick,
}: {
  icon: typeof Layers3;
  title: string;
  text: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div className="card full-empty">
      <span className="empty-file">
        <Icon size={38} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      <Button onClick={onClick}>{button}</Button>
    </div>
  );
}
