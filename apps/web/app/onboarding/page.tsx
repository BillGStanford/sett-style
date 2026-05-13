'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

const AESTHETICS_LIST = [
  'Quiet Luxury', 'Y2K', 'Streetwear', 'Dark Academia', 'Cottagecore',
  'Coastal Cowgirl', 'Minimalist', 'Vintage', 'Grunge', 'Preppy', 'Boho', 'Athleisure',
]

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+']

const DISCOVERY_SOURCES = [
  { value: 'reddit', label: 'Reddit' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'friend', label: 'A friend' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'search', label: 'Google/Search' },
  { value: 'other', label: 'Other' },
]

const GENDER_SUGGESTIONS = [
  'Woman', 'Man', 'Non-binary', 'Genderqueer', 'Genderfluid',
  'Agender', 'Two-Spirit', 'Prefer not to say',
]

export default function OnboardingPage() {
  const router = useRouter()
  const { token, setAuth } = useAuthStore()
  const [step, setStep] = useState(1)
  const [stylePicks, setStylePicks] = useState<string[]>([])
  const [goal, setGoal] = useState<'browse' | 'create' | 'earn' | null>(null)
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Location (optional, shown publicly)
  const [location, setLocation] = useState('')
  // Demographics (optional)
  const [ageRange, setAgeRange] = useState('')
  const [genderIdentity, setGenderIdentity] = useState('')
  const [showGenderSuggestions, setShowGenderSuggestions] = useState(false)
  const [discoverySource, setDiscoverySource] = useState('')

  function toggleStyle(tag: string) {
    setStylePicks(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    )
  }

  async function trackStep(newStep: number) {
    if (!token) return
    // Fire and forget - don't block UI
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/onboarding/step`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ step: newStep }),
    }).catch(() => {})
  }

  async function goToStep(newStep: number) {
    await trackStep(newStep)
    setStep(newStep)
  }

  async function completeOnboarding(redirectTo: '/canvas' | '/feed' = '/canvas') {
    if (!username.trim() || !goal || !token) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: username.trim(),
          style_prefs: stylePicks,
          goal,
          // Location (shown publicly)
          location: location.trim() || null,
          // Optional demographic fields
          age_range: ageRange || null,
          gender_identity: genderIdentity.trim() || null,
          discovery_source: discoverySource || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409) { setUsernameError('That username is taken.'); setStep(3); return }
        throw new Error(data.detail)
      }
      // Refresh user profile so username appears everywhere immediately
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (meRes.ok) {
        const updated = await meRes.json()
        setAuth(updated, token)
      }
      router.push(redirectTo)
    } catch (err: any) {
      setUsernameError(err.message || 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 justify-center mb-10">
          {[1,2,3,4].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step ? 'w-8 bg-near-black' : s < step ? 'w-4 bg-near-black/40' : 'w-4 bg-gray-border'
            }`} />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-black text-near-black mb-2">What styles do you love?</h1>
            <p className="text-sm text-gray-tertiary mb-8">Pick up to 3.</p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {AESTHETICS_LIST.map(tag => (
                <button key={tag} onClick={() => toggleStyle(tag)}
                  className={`rounded-[12px] px-3 py-4 text-xs font-semibold border transition-colors text-center ${
                    stylePicks.includes(tag)
                      ? 'bg-near-black text-white border-near-black'
                      : 'border-gray-border text-gray-primary hover:border-near-black'
                  }`}
                >{tag}</button>
              ))}
            </div>
            <button onClick={() => goToStep(2)} className="w-full btn-primary py-4">
              {stylePicks.length === 0 ? 'Skip' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-black text-near-black mb-2">What's your main goal?</h1>
            <p className="text-sm text-gray-tertiary mb-8">We'll set up your experience accordingly.</p>
            <div className="space-y-3 mb-8">
              {[
                { value: 'browse' as const, label: 'Browse for inspiration', desc: 'Discover looks from other creators.' },
                { value: 'create' as const, label: 'Create and share', desc: 'Build sets and grow your audience.' },
                { value: 'earn' as const, label: 'Create and earn', desc: 'Build sets and earn affiliate commissions.' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setGoal(opt.value)}
                  className={`w-full text-left rounded-[12px] p-4 border transition-colors ${
                    goal === opt.value ? 'border-near-black bg-near-black/[0.03]' : 'border-gray-border hover:border-near-black/40'
                  }`}
                >
                  <p className="font-semibold text-sm text-near-black">{opt.label}</p>
                  <p className="text-xs text-gray-tertiary mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={() => goal && goToStep(3)} disabled={!goal} className="w-full btn-primary py-4 disabled:opacity-40">
              Continue
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-black text-near-black mb-2">Choose your username</h1>
            <p className="text-sm text-gray-tertiary mb-8">This is how you'll appear to the community.</p>
            <input type="text" value={username}
              onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')); setUsernameError('') }}
              placeholder="yourname" maxLength={30}
              className="w-full border border-gray-border rounded-[8px] px-4 py-4 text-base text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black mb-2"
            />
            {usernameError && <p className="text-xs text-red-500 mb-3">{usernameError}</p>}
            <p className="text-xs text-gray-tertiary mb-8">sett.style/@{username || 'yourname'}</p>
            <button onClick={() => username.trim().length >= 3 && goToStep(4)} disabled={username.trim().length < 3}
              className="w-full btn-primary py-4 disabled:opacity-40">Continue</button>
          </div>
        )}

        {/* Step 4 - Final with optional fields */}
        {step === 4 && (
          <div className="text-center">
            <h1 className="text-3xl font-black text-near-black mb-4">Your canvas is empty.</h1>
            <p className="text-gray-primary mb-8 max-w-sm mx-auto">
              Paste any product URL from any fashion site to add your first item. Your sets earn money.
            </p>

            {/* Location (shown publicly) */}
            <div className="text-left mb-6 p-5 bg-gray-bg rounded-xl">
              <label className="block text-sm font-medium text-near-black mb-2">
                Where are you from? <span className="text-gray-tertiary font-normal">(optional, shown on your profile)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. New York, London, Tokyo..."
                maxLength={100}
                className="w-full border border-gray-border rounded-[8px] px-3 py-2.5 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black"
              />
            </div>

            {/* Optional demographics section */}
            <div className="text-left mb-8 p-5 bg-gray-bg rounded-xl">
              <p className="text-xs font-semibold text-gray-tertiary uppercase tracking-wider mb-4">
                Optional — helps us improve
              </p>
              
              {/* Age Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-near-black mb-2">Age range</label>
                <div className="flex flex-wrap gap-2">
                  {AGE_RANGES.map(range => (
                    <button key={range} onClick={() => setAgeRange(ageRange === range ? '' : range)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        ageRange === range
                          ? 'bg-near-black text-white border-near-black'
                          : 'border-gray-border text-gray-primary hover:border-near-black'
                      }`}
                    >{range}</button>
                  ))}
                </div>
              </div>

              {/* Discovery Source */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-near-black mb-2">How did you hear about us?</label>
                <div className="flex flex-wrap gap-2">
                  {DISCOVERY_SOURCES.map(src => (
                    <button key={src.value} onClick={() => setDiscoverySource(discoverySource === src.value ? '' : src.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        discoverySource === src.value
                          ? 'bg-near-black text-white border-near-black'
                          : 'border-gray-border text-gray-primary hover:border-near-black'
                      }`}
                    >{src.label}</button>
                  ))}
                </div>
              </div>

              {/* Gender Identity */}
              <div className="relative">
                <label className="block text-sm font-medium text-near-black mb-2">Gender identity</label>
                <input
                  type="text"
                  value={genderIdentity}
                  onChange={e => setGenderIdentity(e.target.value)}
                  onFocus={() => setShowGenderSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowGenderSuggestions(false), 200)}
                  placeholder="Type or select..."
                  className="w-full border border-gray-border rounded-[8px] px-3 py-2 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black"
                />
                {showGenderSuggestions && !genderIdentity && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-border rounded-lg shadow-lg py-1 max-h-40 overflow-y-auto">
                    {GENDER_SUGGESTIONS.map(g => (
                      <button
                        key={g}
                        onMouseDown={() => { setGenderIdentity(g); setShowGenderSuggestions(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-near-black hover:bg-gray-bg transition-colors"
                      >{g}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button onClick={() => completeOnboarding('/canvas')} disabled={isSubmitting}
                className="w-full btn-primary py-4 disabled:opacity-50">
                {isSubmitting ? 'Setting up…' : 'Start Creating'}
              </button>
              <button onClick={() => completeOnboarding('/feed')} disabled={isSubmitting}
                className="w-full btn-ghost py-4 text-sm disabled:opacity-50">
                Browse first
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}