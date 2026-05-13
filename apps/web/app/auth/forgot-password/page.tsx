'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { SettLogo } from '@/components/ui/sett-logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsLoading(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/"><SettLogo className="h-6 mb-10" /></Link>
        {sent ? (
          <div>
            <h1 className="text-2xl font-black text-near-black mb-4">Check your email.</h1>
            <p className="text-sm text-gray-primary mb-6">
              We sent a password reset link to <strong>{email}</strong>.
            </p>
            <Link href="/auth/login" className="btn-primary block text-center py-3 text-sm">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-black text-near-black mb-2">Reset your password</h1>
            <p className="text-sm text-gray-tertiary mb-8">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button type="submit" disabled={isLoading} className="w-full btn-primary py-3.5 text-sm disabled:opacity-50">
                {isLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-gray-tertiary">
              <Link href="/auth/login" className="underline underline-offset-2 hover:text-near-black">Back to sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
