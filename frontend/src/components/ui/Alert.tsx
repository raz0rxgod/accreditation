import { HTMLAttributes } from 'react';
import { cn } from './cn';

export type AlertTone = 'error' | 'success';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
}

const TONE_CLASSES: Record<AlertTone, string> = {
  error: 'border-seal/30 bg-seal/5 text-seal-dark',
  success: 'border-success/30 bg-success/10 text-success',
};

export function Alert({ tone = 'error', className, ...props }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-card border px-4 py-3 text-sm leading-snug',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
