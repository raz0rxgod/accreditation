'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white border border-primary hover:bg-primary-dark',
  secondary: 'bg-transparent text-ink border border-border hover:bg-paper-dark',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-card px-4 py-2.5 text-sm font-medium',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'disabled:opacity-50 disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
