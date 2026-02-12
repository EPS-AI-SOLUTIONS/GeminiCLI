'use client';

/**
 * ClaudeHydra - Button Component
 * @module components/ui/Button
 *
 * Unified button component with variants.
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';

// ============================================================================
// BUTTON VARIANTS
// ============================================================================

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--matrix-accent)] text-black hover:bg-[var(--matrix-accent-hover)] focus:ring-[var(--matrix-accent)] shadow-[0_0_10px_rgba(0,255,65,0.3)]',
        secondary:
          'bg-black/30 text-[var(--matrix-text)] border border-[var(--matrix-border)] hover:bg-black/50 hover:border-[var(--matrix-accent)] focus:ring-[var(--matrix-border)]',
        ghost:
          'text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] hover:bg-[var(--matrix-border)]/20 focus:ring-[var(--matrix-border)]',
        danger: 'bg-red-500/80 text-white hover:bg-red-600 focus:ring-red-500',
        icon: 'p-2 rounded-full hover:bg-[var(--matrix-border)] text-[var(--matrix-accent)]',
      },
      size: {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-4 py-2',
        lg: 'text-base px-6 py-3',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

// ============================================================================
// TYPES
// ============================================================================

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Optional left icon */
  leftIcon?: ReactNode;
  /** Optional right icon */
  rightIcon?: ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Full width */
  fullWidth?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant,
      size,
      leftIcon,
      rightIcon,
      isLoading,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`${buttonVariants({ variant, size })} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          leftIcon
        )}
        {children}
        {rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
