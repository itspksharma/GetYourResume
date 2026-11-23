import { sectionLabels, type ResumeVersion, type Section } from '@gyr/shared';
export function ResumePreview({ version }: { version: ResumeVersion }) {
  const p = version.profile;
  function section(key: Section) {
    if (version.hidden.includes(key)) return null;
    if (key === 'summary')
      return p.summary || p.objective ? (
        <section key={key}>
          <h2>Professional Summary</h2>
          <p>{p.summary || p.objective}</p>
        </section>
      ) : null;
    if (key === 'skills')
      return p.technicalSkills.length || p.softSkills.length ? (
        <section key={key}>
          <h2>Skills</h2>
          {p.technicalSkills.length > 0 && <p>{p.technicalSkills.join(' · ')}</p>}
          {p.softSkills.length > 0 && <p>{p.softSkills.join(' · ')}</p>}
        </section>
      ) : null;
    return p[key].some((e) => e.title || e.organization || e.description) ? (
      <section key={key}>
        <h2>{sectionLabels[key]}</h2>
        {p[key].map((e) => (
          <div className="resume-entry" key={e.id}>
            <div className="resume-entry-heading">
              <strong>{e.title}</strong>
              <span>{[e.start, e.end].filter(Boolean).join(' – ')}</span>
            </div>
            {(e.organization || e.location) && (
              <p className="resume-meta">
                {[e.organization, e.location].filter(Boolean).join(' · ')}
              </p>
            )}
            {e.url && (
              <p className="resume-link">
                <a href={e.url} target="_blank" rel="noreferrer">
                  {e.url}
                </a>
              </p>
            )}
            {e.description && (
              <ul>
                {e.description
                  .split('\n')
                  .filter((s) => s.trim())
                  .map((line, i) => (
                    <li key={i}>{line.replace(/^\s*[•*-]\s*/, '')}</li>
                  ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    ) : null;
  }
  return (
    <article
      id="resume-document"
      className={`resume-paper template-${version.template} paper-${version.paper}`}
      aria-label="Resume preview"
    >
      <header>
        <h1>{p.personal.name || 'Your name'}</h1>
        {p.personal.title && <p className="resume-title">{p.personal.title}</p>}
        <p className="resume-contact">
          {[p.personal.email, p.personal.phone, p.personal.location].filter(Boolean).join(' | ')}
        </p>
        <div className="resume-links">
          {(['linkedin', 'github', 'portfolio'] as const)
            .filter((k) => p.personal[k])
            .map((k) => (
              <a key={k} href={p.personal[k]} target="_blank" rel="noreferrer">
                {p.personal[k]}
              </a>
            ))}
        </div>
      </header>
      {version.sections.map(section)}
    </article>
  );
}
