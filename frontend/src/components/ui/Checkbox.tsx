import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from './cn';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn('flex items-center gap-2 text-sm text-ink cursor-pointer select-none', className)}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 accent-primary"
          {...props}
        />
        {label}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
