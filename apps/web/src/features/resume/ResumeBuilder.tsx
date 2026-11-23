import { useState, useEffect } from 'react';
import {
  sectionLabels,
  templateSchema,
  type ResumeVersion,
  type Section,
  type AIAction,
} from '@gyr/shared';
import { Button } from '@/components/ui/button';
import { ResumePreview } from './ResumePreview';
import { ProfileEditor } from '@/features/profile/ProfileEditor';
import { AIAssistant } from '@/features/ai/AIAssistant';
import { useWorkspace } from '@/lib/store';
import {
  Printer,
  LayoutTemplate,
  ListOrdered,
  FilePenLine,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
export const templates = {
  classic: { name: 'ATS Classic', description: 'Timeless serif. Clear hierarchy.' },
  modern: { name: 'Modern Professional', description: 'A confident, clean blue accent.' },
  developer: { name: 'Developer Portfolio', description: 'Technical clarity. Monospace details.' },
};
export function ResumeBuilder({ version }: { version: ResumeVersion }) {
  const save = useWorkspace((s) => s.saveVersion);
  const enabled = useWorkspace((s) => s.data.aiEnabled);
  const [tab, setTab] = useState(import.meta.env.VITE_API_URL && enabled ? 'ai' : 'design');
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const style = document.createElement('style');
    style.dataset.print = 'true';
    style.textContent = `@page {size:${version.paper === 'Letter' ? 'letter' : 'A4'};margin:14mm;}`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [version.paper]);
  const update = (patch: Partial<ResumeVersion>) =>
    save({ ...version, ...patch, updatedAt: new Date().toISOString() });
  function move(section: Section, offset: number) {
    const sections = [...version.sections];
    const i = sections.indexOf(section);
    [sections[i], sections[i + offset]] = [sections[i + offset], sections[i]];
    update({ sections });
  }
  function accept(text: string, action: AIAction, target: string) {
    if (['analyze', 'interview'].includes(action)) return false;
    const p = structuredClone(version.profile);
    if (action === 'improve-bullets' || action === 'tone') {
      for (const key of ['experience', 'internships', 'projects'] as const) {
        const entry = p[key].find((e) => e.id === target);
        if (entry) entry.description = text;
      }
    } else p.summary = text;
    return update({ profile: p });
  }
  return (
    <>
      <div className="builder-toolbar card">
        <div className="builder-name">
          <input
            aria-label="Resume name"
            value={version.name}
            maxLength={500}
            onChange={(e) => {
              if (e.target.value.trim()) update({ name: e.target.value });
            }}
          />
          <span className="caption">Saved locally · Master profile stays separate</span>
        </div>
        <div className="actions">
          <label className="sr-only" htmlFor="paper">
            Paper size
          </label>
          <select
            id="paper"
            value={version.paper}
            onChange={(e) => update({ paper: e.target.value as ResumeVersion['paper'] })}
          >
            <option>A4</option>
            <option>Letter</option>
          </select>
          <Button
            onClick={() => {
              document.title = `${version.profile.personal.name || 'My'} Resume`;
              window.print();
            }}
          >
            <Printer size={17} />
            Export PDF
          </Button>
        </div>
      </div>
      <div className="builder-layout">
        <aside className="card builder-controls">
          <div className="builder-tabs">
            {[
              { id: 'design', icon: LayoutTemplate, label: 'Design' },
              { id: 'sections', icon: ListOrdered, label: 'Sections' },
              { id: 'content', icon: FilePenLine, label: 'Content' },
              { id: 'ai', icon: Sparkles, label: 'AI' },
            ].map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                <t.icon size={17} />
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'design' && (
            <div className="stack">
              <div>
                <span className="eyebrow">MAKE IT YOURS</span>
                <h3>Choose your template</h3>
                <p>Three clean layouts. Your story takes the lead.</p>
              </div>
              {templateSchema.options.map((t) => (
                <button
                  key={t}
                  className={`template-option ${version.template === t ? 'selected' : ''}`}
                  onClick={() => update({ template: t })}
                >
                  <span className={`template-thumb thumb-${t}`}>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    <strong>{templates[t].name}</strong>
                    <small>{templates[t].description}</small>
                  </span>
                  <span className="radio-dot" />
                </button>
              ))}
              <div className="form-grid">
                <label className="field">
                  Target role
                  <input
                    value={version.role}
                    maxLength={500}
                    onChange={(e) => update({ role: e.target.value })}
                  />
                </label>
                <label className="field">
                  Target company
                  <input
                    value={version.company}
                    maxLength={500}
                    onChange={(e) => update({ company: e.target.value })}
                  />
                </label>
              </div>
              <div className="notice">
                All templates use selectable text and a single column. No template guarantees
                acceptance by every ATS.
              </div>
              <p className="caption">
                For PDF: choose “Save as PDF,” use the selected paper size, 100% scale, and turn off
                browser headers and footers. Check every page in print preview.
              </p>
            </div>
          )}
          {tab === 'sections' && (
            <div className="stack">
              <p>Choose what to include, then adjust the reading order.</p>
              {version.sections.map((s, i) => (
                <div className="section-control" key={s}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={!version.hidden.includes(s)}
                      onChange={() =>
                        update({
                          hidden: version.hidden.includes(s)
                            ? version.hidden.filter((h) => h !== s)
                            : [...version.hidden, s],
                        })
                      }
                    />
                    {sectionLabels[s]}
                  </label>
                  <div className="actions">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={i === 0}
                      onClick={() => move(s, -1)}
                      aria-label={`Move ${sectionLabels[s]} up`}
                    >
                      <ChevronUp size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={i === version.sections.length - 1}
                      onClick={() => move(s, 1)}
                      aria-label={`Move ${sectionLabels[s]} down`}
                    >
                      <ChevronDown size={15} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'content' && (
            <div className="stack">
              <h3>Edit this version</h3>
              <p>Change any field for this application. Your master profile will stay as it is.</p>
              <label className="field">
                Summary
                <textarea
                  rows={9}
                  value={version.profile.summary}
                  maxLength={8000}
                  onChange={(e) =>
                    update({ profile: { ...version.profile, summary: e.target.value } })
                  }
                />
              </label>
              <Button variant="outline" onClick={() => setEditing(!editing)}>
                {editing ? 'Close full editor' : 'Edit all resume content'}
              </Button>
            </div>
          )}
          {tab === 'ai' && (
            <AIAssistant key={version.id} profile={version.profile} onAccept={accept} />
          )}
        </aside>
        <div className="preview-stage">
          <div className="preview-label">
            <span>LIVE PREVIEW</span>
            <span>
              {version.paper} · {templates[version.template].name}
            </span>
          </div>
          <ResumePreview version={version} />
        </div>
      </div>
      {editing && (
        <div className="card full-editor">
          <div className="section-line">
            <h2>Resume content · {version.name}</h2>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Close editor
            </Button>
          </div>
          <ProfileEditor
            key={version.id}
            profile={version.profile}
            onSave={(profile) => update({ profile })}
          />
        </div>
      )}
    </>
  );
}
