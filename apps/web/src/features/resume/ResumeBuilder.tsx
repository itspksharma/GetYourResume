import { useState } from 'react';
import { sectionLabels, templateSchema, type ResumeVersion, type Section } from '@gyr/shared';
import { Button } from '@/components/ui/button';
import { ResumePreview } from './ResumePreview';
import { useWorkspace } from '@/lib/store';
import { Download, LoaderCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { templates } from './templates';
export { templates } from './templates';

export function ResumeBuilder({ version }: { version: ResumeVersion }) {
  const save = useWorkspace((s) => s.saveVersion);
  const [tab, setTab] = useState('design');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const update = (patch: Partial<ResumeVersion>) =>
    save({ ...version, ...patch, updatedAt: new Date().toISOString() });
  function move(s: Section, offset: number) {
    const sections = [...version.sections];
    const i = sections.indexOf(s);
    [sections[i], sections[i + offset]] = [sections[i + offset], sections[i]];
    update({ sections });
  }
  async function exportPDF() {
    setExporting(true);
    setError('');
    try {
      const { downloadResume } = await import('./ResumePDF');
      await downloadResume(version);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'The PDF could not be generated. Your resume is still saved. Please retry.',
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <div className="builder-toolbar card">
        <div className="builder-name">
          <label className="field">
            Resume name
            <input
              value={version.name}
              maxLength={500}
              onChange={(e) => {
                if (e.target.value.trim()) update({ name: e.target.value });
              }}
            />
          </label>
          <span className="caption">Saved on this device</span>
        </div>
        <div className="actions">
          <label className="field">
            Paper size
            <select
              value={version.paper}
              onChange={(e) => update({ paper: e.target.value as ResumeVersion['paper'] })}
            >
              <option>A4</option>
              <option>Letter</option>
            </select>
          </label>
          <Button onClick={exportPDF} disabled={exporting}>
            {exporting ? <LoaderCircle className="spin" size={18} /> : <Download size={18} />}{' '}
            {exporting ? 'Preparing PDF…' : 'Download PDF'}
          </Button>
        </div>
      </div>
      {error && (
        <div className="notice warning" role="alert">
          {error}
        </div>
      )}
      <div className="builder-layout">
        <aside className="card builder-controls">
          <div className="builder-tabs" aria-label="Template controls">
            <button className={tab === 'design' ? 'active' : ''} onClick={() => setTab('design')}>
              Template
            </button>
            <button
              className={tab === 'sections' ? 'active' : ''}
              onClick={() => setTab('sections')}
            >
              Sections & order
            </button>
          </div>
          {tab === 'design' ? (
            <div className="stack">
              <div>
                <h2>Choose your template</h2>
                <p>Single-column layouts with black text and consistent typography.</p>
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
              <p className="caption">
                Times-compatible Liberation Serif and Arial-compatible Liberation Sans are bundled
                and embedded in your PDF for consistent typography.
              </p>
              <div className="form-grid">
                <label className="field">
                  Target role
                  <input
                    maxLength={500}
                    value={version.role}
                    onChange={(e) => update({ role: e.target.value })}
                  />
                </label>
                <label className="field">
                  Target company
                  <input
                    maxLength={500}
                    value={version.company}
                    onChange={(e) => update({ company: e.target.value })}
                  />
                </label>
              </div>
              <div className="notice">
                The download contains only your resume, with selectable text. No site branding,
                browser title, print date, page numbers, or browser URL is added.
              </div>
              <p className="caption">
                Use the paper size requested by the employer. No template guarantees acceptance by
                every ATS.
              </p>
            </div>
          ) : (
            <div className="stack">
              <h2>Sections and order</h2>
              <p>Show the information relevant to this application.</p>
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
                      aria-label={`Move ${sectionLabels[s]} up`}
                      disabled={i === 0}
                      onClick={() => move(s, -1)}
                    >
                      <ChevronUp size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${sectionLabels[s]} down`}
                      disabled={i === version.sections.length - 1}
                      onClick={() => move(s, 1)}
                    >
                      <ChevronDown size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
        <div className="preview-stage">
          <div className="preview-label">
            <span>RESUME PREVIEW</span>
            <span>
              {version.paper} · {templates[version.template].name}
            </span>
          </div>
          <ResumePreview version={version} />
          <p className="caption preview-note">
            Content preview. The downloaded PDF applies automatic page breaks; open it to review
            every page before applying.
          </p>
        </div>
      </div>
    </>
  );
}
