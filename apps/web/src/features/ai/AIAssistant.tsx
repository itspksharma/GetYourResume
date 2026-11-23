import { useEffect, useRef, useState } from 'react';
import {
  aiSuggestionSchema,
  AI_UNAVAILABLE,
  standardSummary,
  profileEvidence,
  type Profile,
  type AIAction,
  type AISuggestion,
} from '@gyr/shared';
import { Sparkles, ShieldCheck, Check, X, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace, download } from '@/lib/store';

interface Turnstile {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
export function AIAssistant({
  profile,
  onAccept,
  initialAction = 'summary',
  initialTarget = '',
  initialFacts,
}: {
  profile: Profile;
  onAccept?: (text: string, action: AIAction, target: string) => boolean;
  initialAction?: AIAction;
  initialTarget?: string;
  initialFacts?: string;
}) {
  const enabled = useWorkspace((s) => s.data.aiEnabled);
  const job = useWorkspace((s) => s.data.job);
  const [action, setAction] = useState<AIAction>(initialAction);
  const [tone, setTone] = useState('concise');
  const [target, setTarget] = useState(initialTarget);
  const [facts, setFacts] = useState(
    () =>
      initialFacts ??
      [profile.personal.title, profileEvidence(profile)].filter(Boolean).join('\n').slice(0, 6500),
  );
  const [answers, setAnswers] = useState('');
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [edited, setEdited] = useState('');
  const [accepted, setAccepted] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const ready = Boolean(api && siteKey && enabled);
  useEffect(() => {
    if (!ready || !consent) return;
    let disposed = false;
    const mount = () => {
      if (!disposed && container.current && window.turnstile)
        widget.current = window.turnstile.render(container.current, {
          sitekey: siteKey,
          action: 'resume-ai',
          callback: (value: string) => setToken(value),
          'expired-callback': () => setToken(''),
          'error-callback': () => {
            setToken('');
            setError('Human verification failed. Try again or use the standard builder.');
          },
        });
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    if (window.turnstile) mount();
    else {
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.dataset.turnstile = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', mount);
    }
    return () => {
      disposed = true;
      script?.removeEventListener('load', mount);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
      setToken('');
    };
  }, [ready, consent]);
  function choose(next: AIAction) {
    setAction(next);
    setSuggestion(null);
    setAccepted(false);
    setError('');
    setTarget('');
    setFacts(
      next === 'improve-bullets' || next === 'tone' ? '' : profileEvidence(profile).slice(0, 6500),
    );
  }
  async function generate() {
    if (!ready) {
      setError(AI_UNAVAILABLE);
      return;
    }
    if (!consent || !token) {
      setError('Review the data and complete verification first.');
      return;
    }
    setLoading(true);
    setSuggestion(null);
    setAccepted(false);
    setError('');
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 35000);
    try {
      const response = await fetch(`${api}/api/ai/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.current.signal,
        body: JSON.stringify({
          facts,
          job: ['tailor', 'analyze'].includes(action) ? job.slice(0, 6000) : undefined,
          tone,
          token,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || AI_UNAVAILABLE);
      const parsed = aiSuggestionSchema.parse(body.suggestion);
      setSuggestion(parsed);
      setEdited(parsed.text);
    } catch (e) {
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : AI_UNAVAILABLE);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setToken('');
      if (widget.current) window.turnstile?.reset(widget.current);
    }
  }
  const entries = [
    ...profile.experience.map((e) => ({ ...e, kind: 'experience' })),
    ...profile.internships.map((e) => ({ ...e, kind: 'internships' })),
    ...profile.projects.map((e) => ({ ...e, kind: 'projects' })),
  ];
  return (
    <div className="ai-workspace stack">
      <div className="ai-banner">
        <span className="icon-tile">
          <Sparkles size={22} />
        </span>
        <div>
          <h2>AI writing assistance</h2>
          <p>Draft from your real experience, then review and edit before applying.</p>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          What would you like help with?
          <select value={action} onChange={(e) => choose(e.target.value as AIAction)}>
            <option value="summary">Professional summary</option>
            <option value="improve-bullets">Improve experience bullets</option>
            <option value="tailor">Tailor to your target job</option>
            <option value="analyze">Explain skill gaps</option>
            <option value="tone">Adjust professional tone</option>
            <option value="interview">Career profile interview</option>
          </select>
        </label>
        <label className="field">
          Writing tone
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            {['concise', 'formal', 'technical', 'fresher-friendly'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      {['improve-bullets', 'tone', 'interview'].includes(action) && (
        <label className="field">
          Choose an entry to improve
          <select
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setFacts(entries.find((x) => x.id === e.target.value)?.description || '');
            }}
          >
            <option value="">Select an entry, or paste text below</option>
            {entries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title || 'Untitled'} · {e.kind}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        Facts to send to AI
        <textarea
          rows={7}
          value={facts}
          maxLength={6500}
          onChange={(e) => setFacts(e.target.value)}
          placeholder="Supply only real experience, skills, and achievements."
        />
        <small>
          {facts.length}/6500 characters. Contact details are excluded from automatic context.
          Review this text before sending.
        </small>
      </label>
      {['tailor', 'analyze'].includes(action) && (
        <div className="notice">
          {job
            ? `The first ${Math.min(job.length, 6000)} characters of your saved job description will also be sent.`
            : 'Add a job description in the Target Job step first.'}
        </div>
      )}
      {!ready && (
        <div className="notice">
          {AI_UNAVAILABLE}{' '}
          {!api
            ? 'The hosted AI service has not been connected yet.'
            : !enabled
              ? 'AI is turned off in Settings.'
              : 'Human verification has not been configured.'}
        </div>
      )}
      <label className="check-row">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I agree to send the displayed facts and relevant job text to Cloudflare for this request.
          AI suggestions need factual review.
        </span>
      </label>
      <div ref={container} />
      <div className="actions wrap">
        <Button
          disabled={
            loading ||
            facts.trim().length < 5 ||
            (ready && (!consent || !token)) ||
            (['tailor', 'analyze'].includes(action) && !job)
          }
          onClick={generate}
        >
          {loading ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{' '}
          {loading ? 'Writing your suggestion…' : 'Generate with AI'}
        </Button>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => {
            const text = ['improve-bullets', 'tone'].includes(action)
              ? facts
              : action === 'interview'
                ? 'What did you build or contribute?\nWhich tools or methods did you use?\nWhat problem did you solve?\nWhat outcome can you support with evidence?\nWhat was your individual responsibility?'
                : standardSummary(profile);
            if (text) {
              if (!['improve-bullets', 'tone', 'interview'].includes(action)) setAction('summary');
              setSuggestion({
                text,
                notes: [
                  action === 'interview'
                    ? 'Standard interview questions. Answer with your own real experience.'
                    : ['tone', 'improve-bullets'].includes(action)
                      ? 'Your supplied text is retained for manual editing. No AI rewriting was performed.'
                      : 'Assembled locally from your supplied facts using fixed rules. This is not AI-generated.',
                ],
              });
              setEdited(text);
              setAccepted(false);
              setError('');
            } else
              setError(
                'Add your professional title, skills, or project details in the Details step first.',
              );
          }}
        >
          Continue without AI
        </Button>
      </div>
      {error && (
        <div className="notice warning" role="alert">
          {error}
        </div>
      )}
      {suggestion && (
        <section className="suggestion stack">
          <div className="section-line">
            <h3>Review your suggestion</h3>
            <span className="badge">
              <ShieldCheck size={13} />
              Review required
            </span>
          </div>
          <label className="field">
            Edit before accepting
            <textarea
              rows={8}
              value={edited}
              maxLength={7000}
              onChange={(e) => setEdited(e.target.value)}
            />
          </label>
          <ul className="subtle-list">
            {suggestion.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <p className="muted">
            Check every employer, skill, date, and claim. Validation cannot guarantee factual
            accuracy.
          </p>
          <div className="actions wrap">
            {onAccept && !['analyze', 'interview'].includes(action) && (
              <Button
                disabled={
                  !edited.trim() ||
                  accepted ||
                  (['tone', 'improve-bullets'].includes(action) && !target)
                }
                onClick={() => {
                  if (onAccept(edited, action, target)) {
                    setAccepted(true);
                  } else {
                    setError(
                      'Could not save this suggestion. Export the text and resolve the storage issue before retrying.',
                    );
                  }
                }}
              >
                <Check size={16} />
                {accepted ? 'Accepted' : 'Accept suggestion'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => download('GetYourResume-suggestion.txt', edited, 'text/plain')}
            >
              Download text
            </Button>
            <Button variant="ghost" onClick={() => setSuggestion(null)}>
              <X size={16} />
              Reject
            </Button>
          </div>
          {action === 'interview' && (
            <div className="interview-answers stack">
              <label className="field">
                Your answers
                <textarea
                  rows={6}
                  value={answers}
                  maxLength={7000}
                  onChange={(e) => setAnswers(e.target.value)}
                  placeholder="Answer the questions using only your real experience. These answers can become a draft for the selected entry."
                />
              </label>
              <Button
                disabled={!answers.trim() || !target || !onAccept}
                onClick={() => {
                  if (onAccept?.(answers, 'improve-bullets', target)) {
                    setAccepted(true);
                  } else
                    setError(
                      'Your answers could not be saved. Choose an entry and resolve any storage issues.',
                    );
                }}
              >
                {accepted ? 'Answers saved' : 'Use my answers in this entry'}
              </Button>
              <small>
                Select an experience or project entry above. Your answers are saved verbatim,
                without invented claims.
              </small>
            </div>
          )}
          {onAccept && ['tone', 'improve-bullets'].includes(action) && !target && (
            <small>Select the original entry before accepting these bullets.</small>
          )}
        </section>
      )}
    </div>
  );
}
