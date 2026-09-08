import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from './cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-card border border-border bg-white px-3 py-2 text-sm text-ink',
        'placeholder:text-ink-soft/60 transition-colors',
        'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
        'disabled:opacity-50 disabled:bg-paper-dark',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
