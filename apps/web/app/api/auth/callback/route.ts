import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=no_code`)
  }

  // Collect Supabase cookies in a jar so we can attach them to the
  // final redirect *after* we know whether the user needs onboarding.
  const cookieJar: Record<string, { name: string; value: string; options: CookieOptions }> = {}

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieJar[name] = { name, value, options }
        },
        remove(name: string, options: CookieOptions) {
          cookieJar[name] = { name, value: '', options }
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !session) {
    return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
  }

  // Determine where to send the user.
  // New users (no username yet) always go to onboarding.
  // Returning users go to the `next` param or /feed.
  let destination = '/onboarding'

  try {
    const meRes = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (meRes.ok) {
      const user = await meRes.json()
      if (user.username) {
        const next = searchParams.get('next')
        destination = (next && next !== '/onboarding') ? next : '/feed'
      }
    }
  } catch {
    // Backend unavailable — play it safe and send to onboarding
  }

  // Build the final redirect and attach all Supabase session cookies
  const response = NextResponse.redirect(`${origin}${destination}`)
  for (const { name, value, options } of Object.values(cookieJar)) {
    response.cookies.set(name, value, options as any)
  }

  return response
}