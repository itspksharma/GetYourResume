import { useEffect, useRef, useState } from 'react';
import {
  useForm,
  useFieldArray,
  type Control,
  type UseFormRegister,
  type FieldErrors,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  profileSchema,
  blankEntry,
  entryKinds,
  sectionLabels,
  list,
  type Profile,
  type EntryKind,
} from '@gyr/shared';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  UserRound,
  GraduationCap,
  BriefcaseBusiness,
  Wrench,
  FolderKanban,
  Award,
} from 'lucide-react';

type Props = {
  profile: Profile;
  onSave: (p: Profile) => boolean;
  onBuild?: () => void;
  compact?: boolean;
};
const steps = [
  { name: 'About you', icon: UserRound },
  { name: 'Your direction', icon: Wrench },
  { name: 'Experience', icon: BriefcaseBusiness },
  { name: 'Education', icon: GraduationCap },
  { name: 'Projects', icon: FolderKanban },
  { name: 'More about you', icon: Award },
];
export function ProfileEditor({ profile, onSave, onBuild, compact = false }: Props) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('Changes save automatically');
  const {
    register,
    control,
    watch,
    getValues,
    formState: { errors },
    trigger,
    setValue,
  } = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
    mode: 'onChange',
  });
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const invalid = () => !profileSchema.safeParse(getValues()).success;
    const leaving = (e: BeforeUnloadEvent) => {
      if (invalid()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const navigating = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.('a[href^="#"]');
      if (
        link &&
        invalid() &&
        !window.confirm(
          'Some fields are invalid and have not been saved. Leave this editor and discard those unsaved changes?',
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', leaving);
    document.addEventListener('click', navigating, true);
    return () => {
      window.removeEventListener('beforeunload', leaving);
      document.removeEventListener('click', navigating, true);
    };
  }, [getValues]);
  useEffect(() => {
    const subscription = watch(() => {
      setStatus('Saving…');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const parsed = profileSchema.safeParse(getValues());
        if (parsed.success)
          setStatus(
            saveRef.current(parsed.data)
              ? 'All changes saved on this device'
              : 'Unable to save — export your data',
          );
        else setStatus('Fix the highlighted fields to save changes');
      }, 450);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer.current);
      const parsed = profileSchema.safeParse(getValues());
      if (parsed.success) saveRef.current(parsed.data);
    };
  }, [watch, getValues]);
  const save = async () => {
    if (await trigger()) {
      clearTimeout(timer.current);
      return onSave(getValues());
    }
    return false;
  };
  const field = (name: keyof Profile['personal'], label: string, type = 'text') => (
    <label className="field" key={name}>
      {label}
      <input
        type={type}
        {...register(`personal.${name}`)}
        autoComplete={name === 'name' ? 'name' : name === 'email' ? 'email' : 'off'}
        placeholder={
          name === 'title'
            ? 'e.g. Frontend Developer'
            : name === 'location'
              ? 'City, country'
              : name === 'name'
                ? 'Your full name'
                : name === 'email'
                  ? 'you@example.com'
                  : name === 'phone'
                    ? '+91 …'
                    : 'https://'
        }
      />
      {errors.personal?.[name] && (
        <span className="field-error">{errors.personal[name]?.message}</span>
      )}
    </label>
  );
  return (
    <div className={compact ? 'profile-editor compact' : 'profile-editor'}>
      <div className="step-tabs" role="tablist" aria-label="Profile steps">
        {steps.map((s, i) => (
          <button
            type="button"
            key={s.name}
            role="tab"
            aria-selected={step === i}
            className={step === i ? 'active' : ''}
            onClick={async () => {
              if (await save()) setStep(i);
            }}
          >
            <s.icon size={17} />
            <span>{s.name}</span>
          </button>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save()) {
            if (step < 5) setStep(step + 1);
            else onBuild?.();
          }
        }}
        noValidate
      >
        <div className="editor-intro">
          <span className="eyebrow">STEP {step + 1} OF 6</span>
          <h2>
            {
              [
                'Let’s start with the basics.',
                'What do you bring to the table?',
                'Tell your experience story.',
                'Where did you learn?',
                'Show what you’ve built.',
                'The details that make you, you.',
              ][step]
            }
          </h2>
          <p>
            {
              [
                'How should employers get to know and contact you?',
                'Add skills you can demonstrate. A short summary helps connect your story.',
                'Work, internships, or volunteering — describe your actual contribution. It’s okay to skip this if you’re starting out.',
                'Add degrees, courses, or training. Use a consistent date format, such as Jan 2025.',
                'Personal, academic, or professional projects all count. What did you do and what was the outcome?',
                'Include relevant certifications, achievements, awards, languages, and links.',
              ][step]
            }
          </p>
        </div>
        {step === 0 && (
          <div className="form-grid">
            {field('name', 'Full name')}
            {field('title', 'Professional title')}
            {field('email', 'Email address', 'email')}
            {field('phone', 'Phone number', 'tel')}
            {field('location', 'Location')}
            {field('linkedin', 'LinkedIn', 'url')}
            {field('github', 'GitHub', 'url')}
            {field('portfolio', 'Portfolio', 'url')}
          </div>
        )}
        {step === 1 && (
          <div className="stack">
            <label className="field">
              Professional summary
              <textarea
                rows={4}
                {...register('summary')}
                placeholder="Describe your background, focus, and strengths. Leave blank to assemble a summary from your supplied facts."
              />
              {errors.summary && <span className="field-error">{errors.summary.message}</span>}
            </label>
            <label className="field">
              Career objective <span className="muted">Optional</span>
              <textarea
                rows={2}
                {...register('objective')}
                placeholder="What kind of opportunity are you looking for?"
              />
            </label>
            <label className="field">
              Technical / professional skills
              <textarea
                rows={3}
                defaultValue={profile.technicalSkills.join(', ')}
                onChange={(e) =>
                  setValue('technicalSkills', list(e.target.value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder="React, TypeScript, SQL, financial analysis…"
              />
              <small>Separate skills with commas or new lines.</small>
            </label>
            <label className="field">
              Soft skills
              <textarea
                rows={2}
                defaultValue={profile.softSkills.join(', ')}
                onChange={(e) =>
                  setValue('softSkills', list(e.target.value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder="Communication, teamwork…"
              />
            </label>
          </div>
        )}
        {entryKinds.map((kind) => {
          const shown =
            (step === 2 && ['experience', 'internships'].includes(kind)) ||
            (step === 3 && kind === 'education') ||
            (step === 4 && kind === 'projects') ||
            (step === 5 && !['experience', 'internships', 'education', 'projects'].includes(kind));
          return (
            <EntryList
              key={kind}
              kind={kind}
              control={control}
              register={register}
              errors={errors}
              shown={shown}
            />
          );
        })}
        <div className="form-footer">
          <span className="save-status" aria-live="polite">
            <Check size={14} />
            {status}
          </span>
          <div className="actions">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (await save()) setStep(step - 1);
                }}
              >
                Back
              </Button>
            )}
            <Button type="submit">
              {step === 5 ? (onBuild ? 'Build my resume' : 'Save changes') : 'Save & continue'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
function EntryList({
  kind,
  control,
  register,
  errors,
  shown,
}: {
  kind: EntryKind;
  control: Control<Profile>;
  register: UseFormRegister<Profile>;
  errors: FieldErrors<Profile>;
  shown: boolean;
}) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: kind,
    keyName: 'formId',
  });
  if (!shown) return null;
  return (
    <section className="entry-list">
      <div className="section-line">
        <h3>{sectionLabels[kind]}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(blankEntry())}
          disabled={fields.length >= 60}
        >
          <Plus size={15} />
          Add {kind === 'experience' ? 'experience' : 'entry'}
        </Button>
      </div>
      {!fields.length && (
        <div className="entry-empty">No entries yet. Add what’s relevant to your story.</div>
      )}
      {fields.map((f, i) => (
        <div className="entry-card" key={f.formId}>
          <div className="section-line">
            <span className="eyebrow">
              {sectionLabels[kind]} · {i + 1}
            </span>
            <div className="actions">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${kind} ${i + 1} up`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                <ChevronUp size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${kind} ${i + 1} down`}
                disabled={i === fields.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ChevronDown size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${kind} ${i + 1}`}
                onClick={() => remove(i)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
          <div className="form-grid">
            {(['title', 'organization', 'location', 'start', 'end', 'url'] as const).map((key) => (
              <label className="field" key={key}>
                {
                  {
                    title:
                      kind === 'education'
                        ? 'Degree / qualification'
                        : kind === 'languages'
                          ? 'Language'
                          : 'Title / role',
                    organization: kind === 'education' ? 'Institution' : 'Organization / context',
                    location: 'Location',
                    start: 'Start date',
                    end: 'End date / Present',
                    url: 'Relevant link',
                  }[key]
                }
                <input
                  {...register(`${kind}.${i}.${key}`)}
                  placeholder={
                    key === 'url'
                      ? 'https://'
                      : key === 'start'
                        ? 'Jan 2025'
                        : key === 'end'
                          ? 'Present'
                          : ''
                  }
                />
                {errors[kind]?.[i]?.[key] && (
                  <span className="field-error">{errors[kind]?.[i]?.[key]?.message}</span>
                )}
              </label>
            ))}
          </div>
          <label className="field">
            Description / achievements
            <textarea
              rows={4}
              {...register(`${kind}.${i}.description`)}
              placeholder="What did you do? Which tools did you use? What changed? One bullet per line. Include numbers only if you can support them."
            />
            {errors[kind]?.[i]?.description && (
              <span className="field-error">{errors[kind]?.[i]?.description?.message}</span>
            )}
          </label>
        </div>
      ))}
    </section>
  );
}
