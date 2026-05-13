'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Toaster } from '@/components/ui/toaster'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, user, setAuthReady } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (
      user &&
      !user.username &&
      pathname !== '/onboarding' &&
      pathname !== '/auth' &&
      !pathname.startsWith('/auth/')
    ) {
      router.replace('/onboarding')
    }
  }, [user, pathname, router])

  useEffect(() => {
    const supabase = getSupabaseClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        clearAuth()
        setAuthReady()
        return
      }

      // getUser() hits the server, validates the session, and auto-refreshes
      // the access token if it expired but the refresh token is still good.
      const { data: { user: sbUser }, error } = await supabase.auth.getUser()

      if (!sbUser || error) {
        // Session is dead or invalid. Clear auth state silently.
        // The middleware will handle route protection on the next navigation.
        clearAuth()
        setAuthReady()
        return
      }

      // Grab the (possibly refreshed) session so we have a live access token
      const { data: { session: liveSession } } = await supabase.auth.getSession()
      const token = liveSession?.access_token ?? session.access_token

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/users/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const userData = await res.json()
          setAuth(userData, token)
          setAuthReady()
          return
        }
      } catch {}

      // Fallback: minimal auth from Supabase session if API is down
      setAuth({
        id: sbUser.id,
        email: sbUser.email ?? '',
        username: null,
        bio: null,
        avatar_url: null,
        goal: null,
        style_prefs: [],
        plan: 'free',
        wallet_balance: 0,
        total_earned: 0,
        is_email_verified: !!sbUser.email_confirmed_at,
        user_tier: 'general',
        referral_code: null,
        referred_by: null,
      }, token)
      setAuthReady()
    }).catch(() => {
      clearAuth()
      setAuthReady()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') { 
          clearAuth()
          return 
        }
        if (!session) { 
          clearAuth()
          return 
        }
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/users/me`,
            { headers: { Authorization: `Bearer ${session.access_token}` } }
          )
          if (res.ok) {
            const userData = await res.json()
            setAuth(userData, session.access_token)
          }
        } catch {}
      }
    )

    return () => subscription.unsubscribe()
  }, [setAuth, clearAuth, setAuthReady])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}