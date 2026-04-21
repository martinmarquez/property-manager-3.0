import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils.js';

// Badge uses no Radix primitive — it's a styled span
const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--color-primary)] text-white shadow hover:bg-[var(--color-primary-hover)]',
        secondary:
          'border-transparent bg-[var(--color-bg-raised)] text-[var(--color-text-secondary)]',
        destructive:
          'border-transparent bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error-border)]',
        outline:
          'border-[var(--color-border)] text-[var(--color-text-secondary)]',
        success:
          'border-transparent bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
        warning:
          'border-transparent bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
