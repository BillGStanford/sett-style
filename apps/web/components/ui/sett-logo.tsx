import { cn } from '@/lib/utils/cn'

interface SettLogoProps {
  className?: string
  variant?: 'dark' | 'light'
}

/**
 * SettLogo — SETT wordmark as an SVG component.
 * Per brand spec: all-caps, bold grotesque. The word IS the logo.
 * No icon needed. Clean at any size.
 */
export function SettLogo({ className, variant = 'dark' }: SettLogoProps) {
  const color = variant === 'dark' ? '#0A0A0A' : '#FFFFFF'

  return (
    <svg
      viewBox="0 0 80 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-auto', className)}
      aria-label="SETT"
      role="img"
    >
      <text
        x="0"
        y="20"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="900"
        fontSize="22"
        letterSpacing="-0.5"
        fill={color}
      >
        SETT
      </text>
    </svg>
  )
}
