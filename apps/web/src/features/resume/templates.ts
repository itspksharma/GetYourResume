export const templates = {
  classic: {
    name: 'ATS Classic',
    description: 'Times style · traditional, centered heading',
    family: 'ResumeSerif',
  },
  modern: {
    name: 'Modern Professional',
    description: 'Arial style · clean, left-aligned layout',
    family: 'ResumeSans',
  },
  developer: {
    name: 'Developer Portfolio',
    description: 'Arial style · compact, project-friendly hierarchy',
    family: 'ResumeSans',
  },
} as const;
export const PDF_MARGIN = 48;
export const PDF_BODY_SIZE = 11;
export const PDF_LINE_HEIGHT = 1.45;
