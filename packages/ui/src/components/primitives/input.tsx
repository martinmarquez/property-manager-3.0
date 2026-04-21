import React from 'react';
import { cn } from '../../utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-3 py-1 text-sm text-[var(--color-text-primary)] shadow-sm transition-colors',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-[var(--color-text-tertiary)]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
