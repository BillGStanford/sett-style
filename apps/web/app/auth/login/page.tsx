'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'
import { SettLogo } from '@/components/ui/sett-logo'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleOAuth(provider: 'google' | 'apple') {
    setIsLoading(true)
    const supabase = getSupabaseClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/canvas` },
    })
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')
    const result = loginSchema.safeParse(formData)
    if (!result.success) {
      const errs: typeof errors = {}
      result.error.errors.forEach((err) => {
        const f = err.path[0] as keyof typeof errors
        errs[f] = err.message
      })
      setErrors(errs)
      return
    }
    setErrors({})
    setIsLoading(true)
    try {
      // Login via our own API (which validates against PostgreSQL)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Login failed')
      }
      const { access_token, user } = await res.json()
      setAuth(user, access_token)
      router.push(user.username ? '/feed' : '/onboarding')
    } catch (err: any) {
      setApiError(err.message || 'Invalid email or password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-near-black relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 grid grid-cols-2 gap-1 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/10 rounded-sm" />
          ))}
        </div>
        <div className="relative z-10">
          <SettLogo variant="light" className="h-6" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Welcome back.
          </h1>
          <p className="text-white/60 text-base max-w-xs">
            Your sets are waiting. So is your earnings dashboard.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="lg:hidden mb-10">
          <Link href="/"><SettLogo className="h-7" /></Link>
        </div>
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-black text-near-black mb-2">Sign in</h2>
          <p className="text-sm text-gray-tertiary mb-8">
            New to SETT?{' '}
            <Link href="/auth" className="text-near-black underline underline-offset-2">Create account</Link>
          </p>

          <div className="space-y-4">
            <button
              onClick={() => handleOAuth('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 border border-gray-border rounded-[12px] px-4 py-3 text-sm font-medium text-near-black hover:bg-gray-bg transition-colors disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" />
              </svg>
              Continue with Google
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-border" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-tertiary">or</span></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <input
                  type="email" placeholder="Email" value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
              <div>
                <input
                  type="password" placeholder="Password" value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black"
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>
              {apiError && <p className="text-xs text-red-500">{apiError}</p>}
              <div className="flex justify-end">
                <Link href="/auth/forgot-password" className="text-xs text-gray-tertiary hover:text-near-black underline underline-offset-2">
                  Forgot password?
                </Link>
              </div>
              <button
                type="submit" disabled={isLoading}
                className="w-full bg-near-black text-white font-semibold rounded-[12px] py-3.5 text-sm hover:bg-black transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
