import { useState } from 'react';
import { analyzeJob, type Profile } from '@gyr/shared';
import { Button } from '@/components/ui/button';
import { SearchCheck, Check, CircleHelp, FileText, Layers3 } from 'lucide-react';
import { useWorkspace } from '@/lib/store';
export function JobAnalyzer({
  profile,
  onTailor,
}: {
  profile: Profile;
  onTailor: (job: string, role: string) => void;
}) {
  const saved = useWorkspace((s) => s.data.job);
  const commit = useWorkspace((s) => s.commit);
  const [job, setJob] = useState(saved);
  const [analyzed, setAnalyzed] = useState(saved);
  const result = analyzed ? analyzeJob(analyzed, profile) : null;
  return (
    <div className="jobs-grid">
      <div className="card stack">
        <div>
          <span className="eyebrow">KNOW WHERE YOU STAND</span>
          <h2>One job. A clearer direction.</h2>
          <p>
            Paste the full description. We’ll compare its requirements with the evidence in your
            profile.
          </p>
        </div>
        <label className="field">
          Target job description
          <textarea
            rows={15}
            value={job}
            maxLength={18000}
            onChange={(e) => setJob(e.target.value)}
            placeholder={
              'Job title: Frontend Developer\nRequired: React, TypeScript, HTML, CSS…\nPreferred: Vitest and accessibility…'
            }
          />
          <small>{job.length.toLocaleString()}/18,000 characters · Analyzed on your device</small>
        </label>
        <Button
          disabled={!job.trim()}
          onClick={() => {
            if (commit((d) => ({ ...d, job }))) setAnalyzed(job);
          }}
        >
          <SearchCheck size={18} />
          Analyze job compatibility
        </Button>
      </div>
      <div className="stack">
        {result ? (
          <>
            <div className="card">
              <div className="score-head">
                <div
                  className="score-ring"
                  style={{ '--score': `${result.score || 0}%` } as React.CSSProperties}
                >
                  <span>
                    {result.score === null ? '—' : result.score}
                    <small>{result.score === null ? 'no score' : '/ 100'}</small>
                  </span>
                </div>
                <div>
                  <span className="eyebrow">ESTIMATED COMPATIBILITY</span>
                  <h2>{result.title || 'Your target role'}</h2>
                  <p>
                    {result.matched.length} of {result.required.length + result.preferred.length}{' '}
                    recognized skill terms have profile evidence.
                  </p>
                </div>
              </div>
              <p className="score-disclaimer">
                Estimated job compatibility score — not an official ATS score or hiring prediction.
              </p>
              <details>
                <summary>How is this calculated?</summary>
                <p>
                  Required or unspecified skills count 2 points; preferred skills count 1. Score =
                  matched points ÷ possible points × 100 ({result.earned}/{result.total}). Known
                  aliases and exact phrase boundaries are used. No AI generates this number.
                  Education and years of experience need manual verification and are excluded. This
                  curated English vocabulary can miss unfamiliar requirements and cannot measure
                  proficiency.
                </p>
              </details>
            </div>
            <div className="card">
              <h3>
                <Check size={18} />
                Matched skills
              </h3>
              <div className="chips">
                {result.matched.length ? (
                  result.matched.map((s) => (
                    <span className="chip success" key={s}>
                      {s}
                    </span>
                  ))
                ) : (
                  <p>No recognized matches yet. Add evidence you actually have.</p>
                )}
              </div>
              <h3 className="mt">
                <CircleHelp size={18} />
                Missing evidence
              </h3>
              <div className="chips">
                {result.missing.length ? (
                  result.missing.map((s) => (
                    <span className="chip missing" key={s}>
                      {s}
                      {result.preferred.includes(s) ? ' · preferred' : ''}
                    </span>
                  ))
                ) : (
                  <p>No missing terms among the skills we recognized.</p>
                )}
              </div>
            </div>
            <div className="card">
              <h3>
                <FileText size={18} />
                Relevant evidence
              </h3>
              {[...result.experience, ...result.projects].length ? (
                [...result.experience, ...result.projects].map(({ entry, matches }) => (
                  <div className="evidence" key={entry.id}>
                    <strong>{entry.title}</strong>
                    <p>{matches.join(' · ')}</p>
                  </div>
                ))
              ) : (
                <p>No directly matching experience or projects were found.</p>
              )}
              <h3 className="mt">Requirements to verify</h3>
              {result.unverified.length ? (
                <ul className="subtle-list">
                  {result.unverified.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  Review the original description for education, experience, and other requirements.
                </p>
              )}
              {result.terminology.length > 0 && (
                <>
                  <h3 className="mt">Domain context</h3>
                  <ul className="subtle-list">
                    {result.terminology.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
              <h3 className="mt">Next steps</h3>
              <ul className="subtle-list">
                {result.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <Button className="mt" onClick={() => onTailor(analyzed, result.title)}>
                <Layers3 size={17} />
                Create a tailored resume
              </Button>
              <p className="caption">
                Reorders existing skills and projects by relevance. AI can refine the wording after
                you review it.
              </p>
            </div>
          </>
        ) : (
          <div className="card empty-analysis">
            <SearchCheck size={44} />
            <h2>Make your experience connect.</h2>
            <p>
              Your matches, gaps, and relevant projects will appear here. This analysis works even
              when AI is unavailable.
            </p>
            <div className="chips">
              <span className="chip">Explainable rules</span>
              <span className="chip">No invented skills</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
