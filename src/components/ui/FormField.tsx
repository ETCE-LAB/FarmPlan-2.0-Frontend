import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export const controlClass =
  'w-full bg-surface-muted border border-line rounded p-2.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 read-only:text-ink-soft';

interface FieldShellProps {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: (id: string) => ReactNode;
}

/** Label + control wiring via a generated id, so every input is properly labelled. */
function FieldShell({ label, required, hint, className, children }: FieldShellProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs text-ink-soft font-semibold mb-1">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

type Shared = { label: ReactNode; hint?: ReactNode; className?: string };

export function TextField({ label, hint, className, ...input }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} required={input.required} className={className}>
      {(id) => <input id={id} type="text" {...input} className={controlClass} />}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  className,
  ...textarea
}: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} required={textarea.required} className={className}>
      {(id) => <textarea id={id} rows={3} {...textarea} className={controlClass} />}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...select
}: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} hint={hint} required={select.required} className={className}>
      {(id) => (
        <select id={id} {...select} className={controlClass}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}
