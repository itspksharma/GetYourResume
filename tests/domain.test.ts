import { describe, it, expect } from 'vitest';
import {
  blankProfile,
  blankWorkspace,
  blankEntry,
  profileSchema,
  parseBackup,
  createVersion,
  duplicateVersion,
  standardSummary,
  validatedSuggestion,
  completeness,
  analyzeJob,
  normalize,
  extractSkills,
  containsTerm,
  tailorProfile,
} from '@gyr/shared';
describe('profile and version schemas', () => {
  it('accepts an empty draft', () =>
    expect(profileSchema.safeParse(blankProfile()).success).toBe(true));
  it('rejects malformed email and executable links', () => {
    const p = blankProfile();
    p.personal.email = 'broken';
    expect(profileSchema.safeParse(p).success).toBe(false);
    p.personal.email = '';
    p.personal.github = 'javascript:alert(1)';
    expect(profileSchema.safeParse(p).success).toBe(false);
  });
  it('limits content and arrays', () => {
    const p = blankProfile();
    p.summary = 'x'.repeat(8001);
    expect(profileSchema.safeParse(p).success).toBe(false);
  });
  it('wraps the supported profile-only legacy shape', () => {
    const p = blankProfile();
    p.personal.name = 'Taylor';
    expect(parseBackup(JSON.stringify(p)).profile.personal.name).toBe('Taylor');
  });
  it('roundtrips versioned backups', () =>
    expect(parseBackup(JSON.stringify(blankWorkspace()))).toEqual(blankWorkspace()));
  it('refuses future versions and corrupt data', () => {
    expect(() => parseBackup('{')).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...blankWorkspace(), schemaVersion: 99 }))).toThrow(
      'unsupported',
    );
  });
  it('does not count empty drafts as complete', () => expect(completeness(blankProfile())).toBe(0));
  it('builds only a fact-based summary', () => {
    const p = blankProfile();
    p.personal.title = 'Developer';
    p.technicalSkills = ['React'];
    p.projects = [{ ...blankEntry(), title: 'Task board' }];
    expect(standardSummary(p)).toBe('Developer with skills in React. Projects include Task board.');
    expect(standardSummary(blankProfile())).toBe('');
  });
  it('honors user-authored summaries', () => {
    const p = blankProfile();
    p.summary = 'My words.';
    expect(standardSummary(p)).toBe('My words.');
  });
  it('isolates a tailored version from the master profile', () => {
    const p = blankProfile();
    p.personal.name = 'Taylor';
    const v = createVersion(p, 'Engineer', 'Example');
    v.profile.personal.name = 'Other';
    expect(p.personal.name).toBe('Taylor');
    expect(v.role).toBe('Engineer');
    expect(v.company).toBe('Example');
  });
  it('duplicates with fresh identity and independent content', () => {
    const v = createVersion(blankProfile());
    const copy = duplicateVersion(v);
    copy.profile.summary = 'Different';
    expect(copy.id).not.toBe(v.id);
    expect(copy.name).toContain('(copy)');
    expect(v.profile.summary).toBe('');
  });
});
describe('deterministic matching', () => {
  it('normalizes Unicode and spaces', () =>
    expect(normalize('  REACT\n   TypeScript ')).toBe('react typescript'));
  it('does not match Java inside JavaScript or SQL inside MySQL', () => {
    expect(extractSkills('JavaScript and MySQL')).toEqual(['JavaScript', 'MySQL']);
    expect(containsTerm('reactive programming', 'React')).toBe(false);
  });
  it('matches symbolic terms without losing boundaries', () => {
    expect(extractSkills('C++, C# and CI/CD')).toEqual(['C++', 'C#', 'CI/CD']);
  });
  it('matches aliases', () =>
    expect(extractSkills('reactjs, nodejs, postgres')).toEqual(['React', 'Node.js', 'PostgreSQL']));
  it('does not double-count a profile alias as a separate skill', () =>
    expect(extractSkills('ReactJS', ['ReactJS'])).toEqual(['React']));
  it('supports profile-specific exact phrases', () =>
    expect(extractSkills('Experience with AutoCAD', ['AutoCAD'])).toContain('AutoCAD'));
  it('weights required at 2 and preferred at 1', () => {
    const p = blankProfile();
    p.technicalSkills = ['React'];
    const a = analyzeJob('Required: React.\nPreferred: Python.', p);
    expect(a.score).toBe(67);
    expect(a.total).toBe(3);
    expect(a.preferred).toEqual(['Python']);
  });
  it('deduplicates repeated terms', () => {
    const a = analyzeJob('React React reactjs', blankProfile());
    expect(a.total).toBe(2);
    expect(a.required).toEqual(['React']);
  });
  it('prioritizes explicit required mentions over preferred ones', () => {
    const a = analyzeJob('React is required.\nReact is also preferred.', blankProfile());
    expect(a.preferred).toEqual([]);
  });
  it('keeps preferred headings in scope for following bullet lines', () => {
    const a = analyzeJob(
      'Required skills:\n- React\nPreferred qualifications:\n- Python\n- SQL',
      blankProfile(),
    );
    expect(a.preferred).toEqual(['Python', 'SQL']);
    expect(a.total).toBe(4);
  });
  it('returns no score without recognized requirements', () => {
    expect(analyzeJob('', blankProfile()).score).toBeNull();
    expect(analyzeJob('A friendly colleague', blankProfile()).score).toBeNull();
  });
  it('does not treat an objective or desired title as skill evidence', () => {
    const p = blankProfile();
    p.personal.title = 'Python developer';
    p.objective = 'Learn React';
    expect(analyzeJob('Python and React required', p).matched).toEqual([]);
  });
  it('exposes experience and education requirements as unverified', () => {
    const a = analyzeJob('5+ years of experience. Bachelor degree required.', blankProfile());
    expect(a.unverified).toHaveLength(2);
  });
  it('shows matching project evidence', () => {
    const p = blankProfile();
    p.projects = [{ ...blankEntry(), title: 'React dashboard' }];
    expect(analyzeJob('React', p).projects[0].entry.title).toBe('React dashboard');
  });
  it('reorders relevant projects without changing facts or chronology', () => {
    const p = blankProfile();
    p.technicalSkills = ['Python', 'React'];
    p.projects = [
      { ...blankEntry(), title: 'Python app' },
      { ...blankEntry(), title: 'React app' },
    ];
    p.experience = [
      { ...blankEntry(), title: 'First' },
      { ...blankEntry(), title: 'Second' },
    ];
    const tailored = tailorProfile(p, 'React');
    expect(tailored.projects[0].title).toBe('React app');
    expect(p.projects[0].title).toBe('Python app');
    expect(tailored.experience).toEqual(p.experience);
    expect(tailored.technicalSkills).toEqual(['React', 'Python']);
  });
});
describe('untrusted AI output', () => {
  it('validates JSON and rejects unknown fields', () => {
    expect(
      validatedSuggestion(
        { response: '{"text":"Built a dashboard.","notes":[]}' },
        'Built a dashboard',
        'summary',
      ).text,
    ).toBe('Built a dashboard.');
    expect(() =>
      validatedSuggestion({ text: 'ok', notes: [], extra: true }, 'facts', 'summary'),
    ).toThrow();
  });
  it('parses OpenAI-compatible Cloudflare completions', () => {
    expect(
      validatedSuggestion(
        { choices: [{ message: { content: '{"text":"Developer.","notes":[]}' } }] },
        'Developer',
        'summary',
      ).text,
    ).toBe('Developer.');
  });
  it('rejects invented numbers', () =>
    expect(() =>
      validatedSuggestion(
        { text: 'Improved speed by 90%', notes: [] },
        'Built a dashboard',
        'summary',
      ),
    ).toThrow('unsupported number'));
  it('accepts supplied numbers', () =>
    expect(
      validatedSuggestion(
        { text: 'Improved speed by 20%', notes: [] },
        'Measured 20% improvement',
        'improve-bullets',
      ).text,
    ).toContain('20%'));
  it('rejects malformed and empty responses', () => {
    expect(() => validatedSuggestion({ response: 'not json' }, 'facts', 'summary')).toThrow();
    expect(() => validatedSuggestion({ text: '', notes: [] }, 'facts', 'summary')).toThrow();
  });
});
