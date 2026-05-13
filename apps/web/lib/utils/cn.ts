import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn — merge Tailwind class names safely.
 * Resolves conflicts (e.g. p-4 + p-6 → p-6) via tailwind-merge.
 * Standard utility used across the entire component library.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
