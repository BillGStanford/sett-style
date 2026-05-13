/**
 * @sett/contracts/schemas — Zod validation schemas
 * Mirror of the Pydantic validators in services/api/domains/*/schemas.py
 * Use these on the frontend for form validation before hitting the API.
 */

import { z } from 'zod'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

export const onboardingSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or fewer')
    .regex(/^[a-z0-9_.]+$/, 'Only lowercase letters, numbers, dots, and underscores'),
  style_prefs: z.array(z.string()).max(3, 'Select up to 3 aesthetics'),
  goal: z.enum(['browse', 'create', 'earn']),
})

// ── Sets ──────────────────────────────────────────────────────────────────────

export const publishSetSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or fewer'),
  aesthetic_tags: z.array(z.string()).max(5),
  privacy: z.enum(['public', 'private', 'unlisted']),
})

// ── Items ─────────────────────────────────────────────────────────────────────

export const clipItemSchema = z.object({
  url: z.string().url('Enter a valid product URL (must start with https://)'),
})

// ── Commerce ──────────────────────────────────────────────────────────────────

export const payoutSchema = z.object({
  method: z.enum(['paypal', 'bank_transfer']),
  destination: z.string().min(3, 'Enter your PayPal email or bank reference'),
})

// Type exports
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type PublishSetInput = z.infer<typeof publishSetSchema>
export type ClipItemInput = z.infer<typeof clipItemSchema>
