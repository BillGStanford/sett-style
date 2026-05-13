/**
 * apps/web/shared/utils — Shared UI utility functions.
 *
 * Non-domain utility functions used across the frontend.
 * For domain-specific utils, use the feature's own utils file.
 */

/** Merge Tailwind class names safely (re-exported from lib/utils/cn) */
export { cn } from '@/lib/utils/cn'

/** Delay execution for n milliseconds */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Clamp a number between min and max */
export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/** Check if the code is running on the server */
export const isServer = typeof window === 'undefined'

/** Get a cookie value by name */
export function getCookie(name: string): string | null {
  if (isServer) return null
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

/**
 * Debounce a function — useful for search inputs, autosave triggers.
 * Returns a debounced version that delays invocation until after `wait` ms.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}

/** Format bytes to human-readable size: 1048576 → "1.0 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
