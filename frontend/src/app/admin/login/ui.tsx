import { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`paper-card rounded-card shadow-card p-6 ${className}`} {...props} />;
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const base = 'rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'border border-border text-ink hover:border-primary hover:text-primary bg-transparent',
    danger: 'border border-seal-dark text-seal-dark hover:bg-seal-dark hover:text-white bg-transparent',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      {children}
      {error && <span className="text-xs text-seal-dark">{error}</span>}
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-white/60 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary';

// forwardRef здесь обязателен: react-hook-form's register() возвращает { ref, onChange, onBlur, name },
// и без forwardRef React отбрасывает ref (обычные функциональные компоненты его не принимают) —
// тогда RHF не может прочитать значение поля, и валидация "обязательное поле" всегда падает,
// даже если пользователь что-то ввёл.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input {...props} ref={ref} className={`${inputClass} ${props.className ?? ''}`} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => (
  <textarea {...props} ref={ref} className={`${inputClass} ${props.className ?? ''}`} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => (
  <select {...props} ref={ref} className={`${inputClass} ${props.className ?? ''}`} />
));
Select.displayName = 'Select';

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, ...props }, ref) => (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" {...props} ref={ref} className="h-4 w-4 accent-primary" />
      {label}
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: React.ReactNode }) {
  const toneClass = tone === 'error' ? 'border-seal-dark text-seal-dark bg-seal/5' : 'border-green-700 text-green-800 bg-green-50';
  return <div className={`rounded-md border px-4 py-2 text-sm ${toneClass}`}>{children}</div>;
}
