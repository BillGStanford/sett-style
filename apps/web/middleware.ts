import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/canvas', '/onboarding', '/dashboard', '/settings', '/referrals']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))

  if (pathname.startsWith('/ref/')) {
    const code = pathname.slice(5)
    if (code) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('ref', code)
      return NextResponse.redirect(redirectUrl)
    }
  }

  const res = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Set session ID cookie for view deduplication (persists for 1 year)
  if (!request.cookies.get('sett_sid')) {
    const sessionId = crypto.randomUUID()
    res.cookies.set('sett_sid', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === 'production',
    })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (pathname === '/' && session && !request.nextUrl.searchParams.has('browse')) {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  if (isProtected && !session) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/',
    '/canvas/:path*',
    '/onboarding/:path*',
    '/dashboard/:path*',
    '/settings/:path*',
    '/referrals/:path*',
    '/ref/:path*',
    '/sets/:path*',  // Added for view tracking session cookie
  ],
}