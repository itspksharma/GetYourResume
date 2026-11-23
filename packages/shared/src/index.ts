import { z } from 'zod';

const text = z.string().max(500);
const long = z.string().max(8000);
const link = z.union([
  z.literal(''),
  z.url().refine((v) => /^https?:\/\//i.test(v), 'Use an https:// or http:// link'),
]);
export const personalSchema = z.object({
  name: text,
  title: text,
  email: z.union([z.literal(''), z.email()]),
  phone: text,
  location: text,
  linkedin: link,
  github: link,
  portfolio: link,
});
export const entrySchema = z.object({
  id: z.string().min(1).max(100),
  title: text,
  organization: text,
  location: text,
  start: text,
  end: text,
  description: long,
  url: link,
});
export type Entry = z.infer<typeof entrySchema>;
export const entryKinds = [
  'experience',
  'internships',
  'education',
  'projects',
  'certifications',
  'achievements',
  'awards',
  'languages',
  'links',
] as const;
export type EntryKind = (typeof entryKinds)[number];
export const sectionKeys = ['summary', 'skills', ...entryKinds] as const;
export type Section = (typeof sectionKeys)[number];
export const sectionLabels: Record<Section, string> = {
  summary: 'Professional Summary',
  skills: 'Skills',
  experience: 'Work Experience',
  internships: 'Internships',
  education: 'Education',
  projects: 'Projects',
  certifications: 'Certifications',
  achievements: 'Achievements',
  awards: 'Awards',
  languages: 'Languages',
  links: 'Relevant Links',
};
const entries = z.array(entrySchema).max(60);
export const profileSchema = z.object({
  personal: personalSchema,
  summary: long,
  objective: long,
  technicalSkills: z.array(text).max(150),
  softSkills: z.array(text).max(100),
  experience: entries,
  internships: entries,
  education: entries,
  projects: entries,
  certifications: entries,
  achievements: entries,
  awards: entries,
  languages: entries,
  links: entries,
});
export type Profile = z.infer<typeof profileSchema>;
export const templateSchema = z.enum(['classic', 'modern', 'developer']);
export const versionSchema = z.object({
  id: z.string(),
  name: text.min(1),
  role: text,
  company: text,
  template: templateSchema,
  paper: z.enum(['A4', 'Letter']),
  profile: profileSchema,
  sections: z.array(z.enum(sectionKeys)).max(sectionKeys.length),
  hidden: z.array(z.enum(sectionKeys)).max(sectionKeys.length),
  updatedAt: z.iso.datetime(),
});
export type ResumeVersion = z.infer<typeof versionSchema>;
export const workspaceSchema = z.object({
  schemaVersion: z.literal(1),
  profile: profileSchema,
  versions: z.array(versionSchema).max(100),
  job: z.string().max(18000),
  theme: z.enum(['light', 'dark']),
  aiEnabled: z.boolean(),
  sample: z.boolean(),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export function blankProfile(): Profile {
  return {
    personal: {
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
    },
    summary: '',
    objective: '',
    technicalSkills: [],
    softSkills: [],
    experience: [],
    internships: [],
    education: [],
    projects: [],
    certifications: [],
    achievements: [],
    awards: [],
    languages: [],
    links: [],
  };
}
export function blankWorkspace(): Workspace {
  return {
    schemaVersion: 1,
    profile: blankProfile(),
    versions: [],
    job: '',
    theme: 'light',
    aiEnabled: true,
    sample: false,
  };
}
export function blankEntry(): Entry {
  return {
    id: crypto.randomUUID(),
    title: '',
    organization: '',
    location: '',
    start: '',
    end: '',
    description: '',
    url: '',
  };
}
export function list(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}
export function completeness(p: Profile): number {
  const hasEntry = (entries: Entry[]) =>
    entries.some((e) => e.title.trim() || e.organization.trim() || e.description.trim());
  const signals = [
    p.personal.name.trim(),
    p.personal.title.trim(),
    p.personal.email.trim(),
    p.personal.location.trim(),
    p.summary.trim() || p.objective.trim(),
    p.technicalSkills.length,
    hasEntry(p.education),
    hasEntry(p.projects) || hasEntry(p.experience),
  ];
  return Math.round((signals.filter(Boolean).length / signals.length) * 100);
}
export function improvements(p: Profile): string[] {
  return [
    !p.personal.name && 'Add your name and contact details.',
    !p.summary && 'Introduce yourself with a short professional summary.',
    !p.technicalSkills.length && 'List the skills you can demonstrate.',
    !p.education.length && 'Add your education or training.',
    !p.projects.length &&
      !p.experience.length &&
      'Describe a real project, internship, or work experience.',
    [...p.experience, ...p.projects].some((e) => !e.description.trim()) &&
      'Add evidence to your experience and project entries.',
  ].filter((s): s is string => typeof s === 'string');
}
// Rule-based summary: joins supplied facts; never infers seniority or qualifications.
export function standardSummary(p: Profile): string {
  if (p.summary.trim()) return p.summary.trim();
  const parts: string[] = [];
  if (p.personal.title.trim())
    parts.push(
      p.personal.title.trim() +
        (p.technicalSkills.length
          ? ` with skills in ${p.technicalSkills.slice(0, 5).join(', ')}.`
          : '.'),
    );
  else if (p.technicalSkills.length)
    parts.push(`Skills include ${p.technicalSkills.slice(0, 5).join(', ')}.`);
  if (p.projects.some((e) => e.title.trim()))
    parts.push(
      `Projects include ${p.projects
        .filter((e) => e.title.trim())
        .slice(0, 2)
        .map((e) => e.title.trim())
        .join(' and ')}.`,
    );
  if (p.objective.trim()) parts.push(p.objective.trim());
  return parts.join(' ');
}
export function createVersion(p: Profile, role = '', company = ''): ResumeVersion {
  const profile = structuredClone(p);
  profile.summary = standardSummary(profile);
  return {
    id: crypto.randomUUID(),
    name: role ? `${role} Resume` : 'My Resume',
    role,
    company,
    template: 'classic',
    paper: 'A4',
    profile,
    sections: [...sectionKeys],
    hidden: [],
    updatedAt: new Date().toISOString(),
  };
}
export function duplicateVersion(v: ResumeVersion): ResumeVersion {
  return {
    ...structuredClone(v),
    id: crypto.randomUUID(),
    name: `${v.name} (copy)`.slice(0, 500),
    updatedAt: new Date().toISOString(),
  };
}
export function parseBackup(raw: string): Workspace {
  const data: unknown = JSON.parse(raw);
  const workspace = workspaceSchema.safeParse(data);
  if (workspace.success) return workspace.data;
  // Explicit supported legacy shape: a profile-only JSON file, preserved by wrapping it.
  const profile = profileSchema.safeParse(data);
  if (profile.success) return { ...blankWorkspace(), profile: profile.data };
  throw new Error(
    'This file is invalid or uses an unsupported schema version. Your current data has been kept.',
  );
}

export const AI_UNAVAILABLE =
  'AI assistance is temporarily unavailable. You can continue building and analyzing your resume using the free standard tools.';
export const aiActions = [
  'summary',
  'improve-bullets',
  'tailor',
  'analyze',
  'tone',
  'interview',
] as const;
export type AIAction = (typeof aiActions)[number];
export const aiRequestSchema = z
  .object({
    facts: z.string().min(5).max(6500),
    job: z.string().max(6000).optional(),
    tone: z.enum(['concise', 'formal', 'technical', 'fresher-friendly']),
    token: z.string().max(2048),
  })
  .strict();
export const aiSuggestionSchema = z
  .object({
    text: z.string().min(1).max(7000),
    notes: z.array(z.string().max(500)).max(8),
  })
  .strict();
export type AISuggestion = z.infer<typeof aiSuggestionSchema>;
export function validatedSuggestion(raw: unknown, facts: string, action: AIAction): AISuggestion {
  const completion = z
    .object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1) })
    .safeParse(raw);
  const outer = completion.success
    ? completion.data.choices[0].message.content
    : typeof raw === 'object' && raw !== null && 'response' in raw
      ? raw.response
      : raw;
  const parsed = aiSuggestionSchema.parse(typeof outer === 'string' ? JSON.parse(outer) : outer);
  // Reject new numbers in generated resume prose. This is a limited guard, not factual verification.
  if (['summary', 'improve-bullets', 'tailor', 'tone'].includes(action)) {
    const supplied = new Set(facts.match(/\d+(?:[.,]\d+)*(?:%)?/g) || []);
    if ((parsed.text.match(/\d+(?:[.,]\d+)*(?:%)?/g) || []).some((n) => !supplied.has(n)))
      throw new Error('AI introduced an unsupported number.');
  }
  return parsed;
}

export * from './matching';
