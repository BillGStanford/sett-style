import { Metadata } from 'next'
import { Suspense } from 'react'
import { SignupForm } from '@/features/auth/components/signup-form'
import { SettLogo } from '@/components/ui/sett-logo'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sign Up — SETT',
  description: 'Start creating fashion sets and earning affiliate commissions.',
  robots: { index: false, follow: false },
}

/**
 * SignupPage — /auth/signup
 *
 * Design spec (from mockup):
 * - Split layout: left = editorial copy + fashion image grid, right = auth form
 * - "Start creating. Start earning." headline
 * - Google OAuth, Apple OAuth, Email+Password
 * - No username at signup — collected in onboarding
 * - No email verification required to start creating
 */
function SignupContent() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — editorial */}
      <div className="hidden lg:flex lg:w-1/2 bg-near-black relative overflow-hidden flex-col justify-between p-12">
        {/* Fashion image mosaic — placeholder for real set thumbnails */}
        <div className="absolute inset-0 grid grid-cols-2 gap-1 opacity-30">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/5 rounded-sm" />
          ))}
        </div>

        <div className="relative z-10">
          <SettLogo variant="light" className="h-6" />
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Start creating.
            <br />
            Start earning.
          </h1>
          <p className="text-white/60 text-base max-w-xs leading-relaxed">
            Join thousands building outfits and income on the canvas built for fashion creators.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Link href="/">
            <SettLogo className="h-7" />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-black text-near-black mb-2">Create your account</h2>
          <p className="text-sm text-gray-tertiary mb-8">
            Already have one?{' '}
            <Link href="/auth/login" className="text-near-black underline underline-offset-2">
              Sign in
            </Link>
          </p>

          {/* SignupForm uses useSearchParams to read ?ref= */}
          <SignupForm />

          <p className="mt-6 text-xs text-gray-tertiary text-center">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-near-black">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-near-black">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  )
}