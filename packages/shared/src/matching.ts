import type { Profile } from './index';

// Curated aliases avoid fuzzy substring matches (Java is not JavaScript).
const dictionary: Record<string, string[]> = {
  JavaScript: ['javascript', 'js', 'ecmascript'],
  TypeScript: ['typescript', 'ts'],
  React: ['react', 'react.js', 'reactjs'],
  'Node.js': ['node.js', 'nodejs', 'node js'],
  Python: ['python'],
  Java: ['java'],
  'C++': ['c++'],
  'C#': ['c#', 'c sharp'],
  HTML: ['html', 'html5'],
  CSS: ['css', 'css3'],
  SQL: ['sql'],
  PostgreSQL: ['postgresql', 'postgres'],
  MySQL: ['mysql'],
  MongoDB: ['mongodb', 'mongo'],
  Git: ['git'],
  GitHub: ['github'],
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  AWS: ['aws', 'amazon web services'],
  Azure: ['azure'],
  Cloudflare: ['cloudflare'],
  Linux: ['linux'],
  REST: ['rest', 'restful'],
  GraphQL: ['graphql'],
  'CI/CD': ['ci/cd', 'continuous integration'],
  Testing: ['testing', 'unit tests', 'unit testing'],
  Vitest: ['vitest'],
  Jest: ['jest'],
  Playwright: ['playwright'],
  Accessibility: ['accessibility', 'wcag', 'a11y'],
  Figma: ['figma'],
  Tailwind: ['tailwind', 'tailwindcss'],
  Angular: ['angular'],
  Vue: ['vue', 'vue.js'],
  Svelte: ['svelte'],
  NextJS: ['next.js', 'nextjs'],
  'Machine learning': ['machine learning'],
  'Data analysis': ['data analysis', 'data analytics'],
  Excel: ['excel'],
  'Power BI': ['power bi', 'powerbi'],
  Tableau: ['tableau'],
  Pandas: ['pandas'],
  Communication: ['communication'],
  Leadership: ['leadership'],
  Teamwork: ['teamwork', 'team collaboration'],
  'Project management': ['project management'],
  Agile: ['agile', 'scrum'],
  Design: ['ui/ux', 'user experience', 'user interface'],
  Sales: ['sales'],
  Marketing: ['marketing'],
  SEO: ['seo', 'search engine optimization'],
  Accounting: ['accounting'],
  Finance: ['finance', 'financial analysis'],
  'Customer service': ['customer service', 'customer support'],
};
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}
function escaped(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9+#])${escaped(normalize(term))}(?=$|[^a-z0-9+#])`, 'i').test(
    normalize(text),
  );
}
export function extractSkills(text: string, custom: string[] = []): string[] {
  const known = Object.entries(dictionary)
    .filter(([, aliases]) => aliases.some((a) => containsTerm(text, a)))
    .map(([label]) => label);
  const extra = custom.filter(
    (s) =>
      s.trim().length > 1 &&
      containsTerm(text, s) &&
      !Object.values(dictionary).some((aliases) =>
        aliases.some((a) => normalize(a) === normalize(s)),
      ),
  );
  return [...new Set([...known, ...extra])];
}
export function profileEvidence(p: Profile): string {
  // Objectives, links, and an intended title are not evidence of a skill.
  return [
    p.summary,
    ...p.technicalSkills,
    ...p.softSkills,
    ...p.experience.map((e) => e.title + ' ' + e.description),
    ...p.internships.map((e) => e.title + ' ' + e.description),
    ...p.projects.map((e) => e.title + ' ' + e.description),
    ...p.education.map((e) => e.title + ' ' + e.description),
    ...p.certifications.map((e) => e.title + ' ' + e.description),
  ].join('\n');
}
export function analyzeJob(job: string, p: Profile) {
  const sentences = job.split(/\n|(?<=[.!?])\s+/).filter(Boolean);
  const custom = [...p.technicalSkills, ...p.softSkills];
  const skills = extractSkills(job, custom);
  let preferredSection = false;
  const occurrences = sentences.map((line) => {
    if (
      /^(?:preferred(?: skills| qualifications| requirements)?|nice.to.have|bonus|desirable|optional)\s*:?\s*$/i.test(
        line.trim(),
      )
    )
      preferredSection = true;
    else if (
      /^(?:required(?: skills| qualifications| requirements)?|requirements|qualifications|responsibilities|about (?:you|the role))\s*:?\s*$/i.test(
        line.trim(),
      )
    )
      preferredSection = false;
    const optional =
      !/required|must|essential/i.test(line) &&
      (preferredSection || /preferred|nice.to.have|bonus|desirable|optional/i.test(line));
    return { skills: extractSkills(line, custom), optional };
  });
  const preferred = skills.filter(
    (s) =>
      occurrences.some((o) => o.skills.includes(s) && o.optional) &&
      !occurrences.some((o) => o.skills.includes(s) && !o.optional),
  );
  const required = skills.filter((s) => !preferred.includes(s));
  const evidence = profileEvidence(p);
  const possessed = extractSkills(evidence, custom);
  const matched = skills.filter((s) => possessed.includes(s));
  const missing = skills.filter((s) => !possessed.includes(s));
  const total = required.length * 2 + preferred.length;
  const earned = matched.reduce((sum, s) => sum + (preferred.includes(s) ? 1 : 2), 0);
  const score = total ? Math.round((earned / total) * 100) : null;
  const unverified = sentences.filter((s) =>
    /\d+\+?\s*(?:-|to)?\s*\d*\s*years?|bachelor|master|degree|diploma|ph\.?d|clearance|license|licence|work authorization|eligible to work/i.test(
      s,
    ),
  );
  const relevant = (entries: Profile['projects']) =>
    entries
      .map((e) => ({
        entry: e,
        matches: extractSkills(e.title + ' ' + e.description, custom).filter((s) =>
          skills.includes(s),
        ),
      }))
      .filter((e) => e.matches.length)
      .sort((a, b) => b.matches.length - a.matches.length);
  const title =
    sentences.find((s) => /^(?:job title|role|position)\s*:/i.test(s))?.replace(/^[^:]+:\s*/, '') ||
    (sentences[0] || '').slice(0, 120);
  return {
    title,
    required,
    preferred,
    matched,
    missing,
    score,
    earned,
    total,
    unverified,
    experience: relevant([...p.experience, ...p.internships]),
    projects: relevant(p.projects),
    terminology: sentences
      .filter((s) => /responsibilit|industry|domain|healthcare|banking|education|retail/i.test(s))
      .slice(0, 6),
    suggestions: [
      ...(missing.length
        ? [
            `If you have evidence of ${missing.slice(0, 4).join(', ')}, add it. Otherwise treat these as learning gaps.`,
          ]
        : []),
      ...(!skills.length
        ? [
            'No supported skill terms were found. Review the requirements manually; a numerical score would be misleading.',
          ]
        : []),
      'Review experience, education, and any unrecognized requirements manually. Skill mentions alone do not verify proficiency.',
    ],
  };
}
export function tailorProfile(p: Profile, job: string): Profile {
  const result = structuredClone(p);
  const required = analyzeJob(job, p);
  const relevance = (s: string) =>
    extractSkills(s, [...p.technicalSkills, ...p.softSkills]).filter((k) =>
      [...required.required, ...required.preferred].includes(k),
    ).length;
  result.projects.sort(
    (a, b) => relevance(b.title + ' ' + b.description) - relevance(a.title + ' ' + a.description),
  );
  result.technicalSkills.sort((a, b) => relevance(b) - relevance(a));
  // Work history retains original chronology. Content is never fabricated or rewritten.
  return result;
}
