import { blankProfile, type Profile } from './index';
export function sampleProfile(): Profile {
  return {
    ...blankProfile(),
    personal: {
      name: 'Alex Morgan',
      title: 'Frontend Developer',
      email: 'alex@example.com',
      phone: '',
      location: 'Bengaluru, India',
      linkedin: '',
      github: 'https://github.com/example',
      portfolio: '',
    },
    summary:
      'Frontend developer focused on accessible web applications. Hands-on experience with React, TypeScript, and responsive interface design through independent projects.',
    technicalSkills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Git', 'Vitest', 'REST'],
    softSkills: ['Communication', 'Teamwork'],
    education: [
      {
        id: 'sample-education',
        title: 'B.Tech in Computer Science',
        organization: 'Example Institute of Technology',
        start: '2021',
        end: '2025',
        location: 'Bengaluru',
        description: 'Coursework: data structures, databases, and software engineering.',
        url: '',
      },
    ],
    projects: [
      {
        id: 'sample-project',
        title: 'Community Task Board',
        organization: 'Independent project',
        start: '2025',
        end: '',
        location: '',
        description:
          'Built a responsive task board using React and TypeScript.\nAdded keyboard navigation and unit tests with Vitest.\nIntegrated a REST API to organize shared tasks.',
        url: '',
      },
    ],
  };
}
