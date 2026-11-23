import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { createVersion, blankProfile } from '@gyr/shared';
import { ResumePreview } from '@/features/resume/ResumePreview';
it('renders untrusted content as text and respects visibility', () => {
  const p = blankProfile();
  p.personal.name = 'Taylor';
  p.summary = '<script>alert(1)</script>';
  p.technicalSkills = ['React'];
  const v = createVersion(p);
  v.hidden = ['skills'];
  const { container } = render(<ResumePreview version={v} />);
  expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  expect(container.querySelector('script')).toBeNull();
  expect(screen.queryByText('Skills')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Taylor' })).toBeInTheDocument();
});
