import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase browser client — use inside Client Components.
 * Uses the modern @supabase/ssr package (replaces deprecated auth-helpers-nextjs).
 */
export function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
