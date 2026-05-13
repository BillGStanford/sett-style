/**
 * @sett/design-system/components
 *
 * Base component primitives that implement the SETT design system.
 * These are unstyled-friendly wrappers around Radix UI primitives,
 * pre-configured with SETT's exact visual spec.
 *
 * Usage in apps/web:
 *   import { SETTButton } from '@sett/design-system/components'
 *
 * Note: Most styling lives in tailwind.config.ts and globals.css via
 * the .btn-primary, .btn-secondary, .sett-card utility classes.
 * These components are for more complex interactive patterns.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

/** Base variant → className map — matches globals.css definitions */
export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger:
    'bg-red-50 text-red-600 border border-red-200 rounded-[12px] font-semibold hover:bg-red-100 transition-colors',
}

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}
