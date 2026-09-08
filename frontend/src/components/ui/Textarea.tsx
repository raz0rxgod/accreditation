import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from './cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
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
  },
);

Textarea.displayName = 'Textarea';
