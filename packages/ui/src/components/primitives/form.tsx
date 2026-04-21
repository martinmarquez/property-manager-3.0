/**
 * Form primitives — label + message wrappers for use with any form library.
 * These are style-only wrappers; validation logic is handled by the caller.
 */
import React, { createContext, useContext } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../utils.js';
import { Label } from './label.js';

// ─── Field context ────────────────────────────────────────────────────────────
interface FormFieldContextValue {
  name: string;
}

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);

export function FormField({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <FormFieldContext.Provider value={{ name }}>
      {children}
    </FormFieldContext.Provider>
  );
}

// ─── Item context ─────────────────────────────────────────────────────────────
interface FormItemContextValue {
  id: string;
}

const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue);

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = 'FormItem';

// ─── Label ────────────────────────────────────────────────────────────────────
export const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { id } = useContext(FormItemContext);
  return (
    <Label
      ref={ref}
      className={cn(className)}
      htmlFor={id}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

// ─── Control ──────────────────────────────────────────────────────────────────
export const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => {
    const { id } = useContext(FormItemContext);
    return <div ref={ref} id={id} {...props} />;
  },
);
FormControl.displayName = 'FormControl';

// ─── Description ─────────────────────────────────────────────────────────────
export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-[var(--color-text-tertiary)]', className)}
    {...props}
  />
));
FormDescription.displayName = 'FormDescription';

// ─── Message ──────────────────────────────────────────────────────────────────
export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) return null;
  return (
    <p
      ref={ref}
      className={cn('text-xs font-medium text-[var(--color-error)]', className)}
      {...props}
    >
      {children}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

// ─── Root Form wrapper ────────────────────────────────────────────────────────
export const Form = React.forwardRef<HTMLFormElement, React.FormHTMLAttributes<HTMLFormElement>>(
  ({ className, ...props }, ref) => (
    <form ref={ref} className={cn('space-y-4', className)} {...props} />
  ),
);
Form.displayName = 'Form';
