'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'

const signupSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  referralCode: z.string().max(20).optional(),
})

type SignupData = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuthStore()
  
  // Get referral code from URL (read-only, cannot be removed)
  const urlReferralCode = searchParams.get('ref')
  
  const [formData, setFormData] = useState<SignupData>({ 
    email: '', 
    password: '',
    referralCode: urlReferralCode ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof SignupData, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // Keep referral code synced from URL
  useEffect(() => {
    if (urlReferralCode) {
      setFormData(prev => ({ ...prev, referralCode: urlReferralCode }))
    }
  }, [urlReferralCode])

  async function handleOAuth(provider: 'google' | 'apple') {
    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?ref=${urlReferralCode ?? ''}`,
        },
      })
      if (error) throw error
    } catch {
      setApiError('OAuth sign-in failed. Try again.')
      setIsLoading(false)
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')

    const result = signupSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignupData, string>> = {}
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SignupData
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setIsLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?ref=${urlReferralCode ?? ''}`,
        },
      })
      if (error) throw error

      // Register in our own backend to create the user row + password hash
      const body: Record<string, string> = {
        email: formData.email,
        password: formData.password,
      }
      // Only include referral code if present
      if (formData.referralCode) {
        body.referral_code = formData.referralCode
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const { access_token, user } = await res.json()
        setAuth(user, access_token)
        router.push('/onboarding')
      } else {
        // Backend returned an error — show it instead of silently redirecting
        const errData = await res.json().catch(() => null)
        setApiError(errData?.detail || 'Sign-up failed. Please try again.')
      }
    } catch (err: any) {
      setApiError(err?.message || 'Sign-up failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isReferralLocked = !!urlReferralCode

  return (
    <div className="space-y-4">
      <button
        onClick={() => handleOAuth('google')}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 border border-gray-border rounded-[12px] px-4 py-3 text-sm font-medium text-near-black hover:bg-gray-bg transition-colors disabled:opacity-50"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <button
        onClick={() => handleOAuth('apple')}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 border border-gray-border rounded-[12px] px-4 py-3 text-sm font-medium text-near-black hover:bg-gray-bg transition-colors disabled:opacity-50"
      >
        <AppleIcon />
        Continue with Apple
      </button>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-tertiary">or</span>
        </div>
      </div>

      <form onSubmit={handleEmailSignup} className="space-y-3">
        <div>
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black transition-colors"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
            className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black transition-colors"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
        </div>

        {/* Referral Code Field */}
        <div>
          <div className="relative">
            <input
              type="text"
              placeholder="Referral code (optional)"
              value={formData.referralCode ?? ''}
              onChange={(e) => {
                if (!isReferralLocked) {
                  setFormData((p) => ({ ...p, referralCode: e.target.value }))
                }
              }}
              readOnly={isReferralLocked}
              className={`w-full border rounded-[8px] px-4 py-3 pr-20 text-sm placeholder-gray-tertiary focus:outline-none focus:border-near-black transition-colors ${
                isReferralLocked 
                  ? 'border-green-200 bg-green-50/50 text-green-800 cursor-not-allowed' 
                  : 'border-gray-border text-near-black'
              }`}
            />
            {isReferralLocked && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span className="text-xs font-medium text-green-700">Applied</span>
              </div>
            )}
          </div>
          {isReferralLocked && (
            <p className="mt-1 text-xs text-green-600">
              You were referred by a friend — welcome! 🎉
            </p>
          )}
          {errors.referralCode && <p className="mt-1 text-xs text-red-500">{errors.referralCode}</p>}
        </div>

        {apiError && <p className="text-xs text-red-500">{apiError}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-near-black text-white font-semibold rounded-[12px] py-3.5 text-sm hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M12.47 1c.1 1.17-.34 2.32-1.05 3.14-.73.84-1.88 1.46-3.03 1.37-.12-1.12.42-2.3 1.1-3.06C10.26 1.61 11.44 1.06 12.47 1zm3.28 11.66c-.58 1.27-1.27 2.44-2.27 3.3-.76.65-1.58.69-2.44.69-.87 0-1.7-.03-2.63-.69-1.04-.73-1.93-.73-2.95 0-.87.64-1.71.69-2.54.69-1.05 0-1.8-.35-2.56-.98C-1.62 13.7-.97 8.95 2.63 6.64c1.28-.81 2.77-.78 3.9 0 .53.36.97.44 1.47.44.5 0 1.02-.1 1.72-.44 1.3-.63 2.82-.58 4.03.27 1.7 1.17 2.37 2.96 2 4.75z" />
    </svg>
  )
}