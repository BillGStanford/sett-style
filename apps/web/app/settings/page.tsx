'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/layout/site-header'
import { useAuthStore } from '@/lib/store/auth-store'
import { getSupabaseClient } from '@/lib/supabase/client'

const tierConfig = {
  founder: {
    label: 'Founding Member',
    emoji: '🥇',
    style: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200',
    perks: [
      'Free Pro plan for life',
      '75% revenue share (+5% permanent boost)',
      'Founding Member badge (Profile, Canvas, Sets)',
      'Private Founder community access',
      'Permanent spot on the /founders page'
    ]
  },
  early_user: {
    label: 'Early User',
    emoji: '🚀',
    style: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    perks: [
      '6 months free Pro ($4.99/mo after)',
      '72% revenue share (+2% permanent boost)',
      'Early User badge (Profile)',
      'Entry into exclusive Early User challenges'
    ]
  },
  general: {
    label: 'General User',
    emoji: '👤',
    style: 'bg-off-white border-gray-border',
    perks: [
      '25 item limit on canvas',
      '70% standard revenue share',
      'Unlock activity badges by publishing sets & earning commissions'
    ]
  }
}

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'] as const

const GENDER_SUGGESTIONS = [
  'Woman', 'Man', 'Non-binary', 'Genderqueer', 'Genderfluid',
  'Agender', 'Two-Spirit', 'Prefer not to say',
]

export default function SettingsPage() {
  const { user, token, isAuthenticated, isAuthReady, clearAuth, updateUser } = useAuthStore()
  const router = useRouter()
  
  // Profile form state
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [showFollowers, setShowFollowers] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  
  // Demographics state
  const [ageRange, setAgeRange] = useState('')
  const [genderIdentity, setGenderIdentity] = useState('')
  const [showGenderSuggestions, setShowGenderSuggestions] = useState(false)
  const [isSavingDemo, setIsSavingDemo] = useState(false)
  const [savedDemo, setSavedDemo] = useState(false)

  // Track if form has been initialized to prevent re-initialization loops
  const [isInitialized, setIsInitialized] = useState(false)

  // Auth check
  useEffect(() => {
    if (!isAuthReady) return
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthReady, isAuthenticated, router])

  // Initialize form values from user data - runs only once when user loads
  useEffect(() => {
    if (user && !isInitialized) {
      setBio(user.bio ?? '')
      setLocation(user.location ?? '')
      setShowFollowers(user.show_followers ?? true)
      setAgeRange(user.age_range ?? '')
      setGenderIdentity(user.gender_identity ?? '')
      setIsInitialized(true)
    }
  }, [user, isInitialized])

  // Handle profile save
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    
    setIsSaving(true)
    setSaveError('')
    
    try {
      const payload: Record<string, string | boolean | null> = { 
        bio: bio.trim() || null,
        location: location.trim() || null,
      }
      
      console.log('Saving profile with payload:', payload)
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      
      console.log('Response status:', res.status)
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        const msg = errData?.detail || `Error ${res.status}`
        console.error('Save failed:', msg, errData)
        setSaveError(msg)
        return
      }
      
      const updated = await res.json()
      console.log('Updated user from API:', updated)
      
      // Update the store with fresh user data
      updateUser(updated)
      
      // Update local state with saved values
      setBio(updated.bio ?? '')
      setLocation(updated.location ?? '')
      
      // Show success message
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save error:', err)
      setSaveError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleShowFollowers() {
    if (!token) return
    
    const newValue = !showFollowers
    setShowFollowers(newValue)
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ show_followers: newValue }),
      })
      
      if (res.ok) {
        const updated = await res.json()
        updateUser(updated)
      } else {
        // Revert on error
        setShowFollowers(!newValue)
      }
    } catch {
      setShowFollowers(!newValue)
    }
  }

  async function handleSaveDemographics() {
    if (!token) return
    
    setIsSavingDemo(true)
    
    try {
      const payload = {
        age_range: ageRange || null,
        gender_identity: genderIdentity.trim() || null,
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        const updated = await res.json()
        updateUser(updated)
        
        // Update local state with saved values
        setAgeRange(updated.age_range ?? '')
        setGenderIdentity(updated.gender_identity ?? '')
        
        setSavedDemo(true)
        setTimeout(() => setSavedDemo(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save demographics:', error)
    } finally {
      setIsSavingDemo(false)
    }
  }

  async function handleUpgradeToPro() {
    if (!token) return
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commerce/subscribe/pro`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (res.ok) {
        const { checkout_url } = await res.json()
        window.location.href = checkout_url
      } else {
        alert("Stripe not configured yet. Check QUICKSTART.md.")
      }
    } catch {
      alert("Could not start checkout. Try again later.")
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    clearAuth()
    router.push('/')
  }

  // Loading state
  if (!isAuthReady || !isInitialized) {
    return (
      <>
        <SiteHeader />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-pulse text-gray-tertiary">Loading...</div>
          </div>
        </main>
      </>
    )
  }

  if (!user) return null

  const tier = tierConfig[user.user_tier as keyof typeof tierConfig] || tierConfig.general

  return (
    <>
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-near-black">Settings</h1>
          <p className="text-sm text-gray-tertiary mt-1">Manage your account, profile, and preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile */}
            <section className="sett-card p-6">
              <h2 className="text-base font-black text-near-black mb-6">Profile</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-near-black block mb-1.5">Username</label>
                    <input 
                      value={user.username ?? ''} 
                      disabled
                      className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-gray-tertiary bg-off-white cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-tertiary">Cannot be changed.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-near-black block mb-1.5">Email</label>
                    <input 
                      value={user.email} 
                      disabled
                      className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-gray-tertiary bg-off-white cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-near-black block mb-1.5">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. New York, London, Tokyo..."
                    maxLength={100}
                    className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black"
                  />
                  <p className="mt-1 text-xs text-gray-tertiary">Shown publicly on your profile.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-near-black block mb-1.5">Bio</label>
                  <textarea 
                    value={bio} 
                    onChange={e => setBio(e.target.value)} 
                    rows={3} 
                    maxLength={200}
                    placeholder="Tell the community a little about your style…"
                    className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black resize-none"
                  />
                </div>

                {/* Error message */}
                {saveError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                    {saveError}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="btn-primary text-sm px-6 py-3 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : saved ? '✓ Saved' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </section>

            {/* Subscription & Tier */}
            <section className={`sett-card border overflow-hidden ${tier.style}`}>
              <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tier.emoji}</span>
                    <h2 className="text-base font-black text-near-black">{tier.label}</h2>
                  </div>
                  <p className="text-sm text-gray-primary">
                    Current Plan: <strong className="text-near-black capitalize">{user.plan}</strong>
                  </p>
                </div>
                
                {user.plan === 'free' && (
                  <button 
                    onClick={handleUpgradeToPro} 
                    className="btn-primary text-sm px-5 py-2.5 whitespace-nowrap flex-shrink-0"
                  >
                    Upgrade to Pro — $9.99/mo
                  </button>
                )}
              </div>
              
              <div className="px-6 pb-6 border-t border-black/10 bg-white/40">
                <p className="text-xs font-bold text-near-black uppercase tracking-wider mt-4 mb-3">Included Perks:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                      <span className="text-gray-primary">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* Personalization */}
            <section className="sett-card p-6">
              <h2 className="text-base font-black text-near-black mb-1">Personalization</h2>
              <p className="text-xs text-gray-tertiary mb-5">
                Optional. <span className="font-medium text-gray-primary">Never shown publicly.</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-near-black mb-2">Age range</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AGE_RANGES.map(range => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setAgeRange(ageRange === range ? '' : range)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                          ageRange === range
                            ? 'bg-near-black text-white border-near-black'
                            : 'border-gray-border text-gray-primary hover:border-near-black'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-near-black mb-2">Gender identity</label>
                  <input
                    type="text"
                    value={genderIdentity}
                    onChange={e => setGenderIdentity(e.target.value)}
                    onFocus={() => setShowGenderSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowGenderSuggestions(false), 200)}
                    placeholder="Type or select…"
                    className="w-full border border-gray-border rounded-[8px] px-3 py-2 text-sm text-near-black placeholder-gray-tertiary focus:outline-none focus:border-near-black"
                  />
                  {showGenderSuggestions && !genderIdentity && (
                    <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
                      {GENDER_SUGGESTIONS.map(g => (
                        <button
                          key={g}
                          type="button"
                          onMouseDown={() => { setGenderIdentity(g); setShowGenderSuggestions(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-near-black hover:bg-gray-bg transition-colors"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveDemographics}
                  disabled={isSavingDemo}
                  className="w-full btn-primary text-sm px-6 py-2.5 disabled:opacity-50 mt-2"
                >
                  {isSavingDemo ? 'Saving…' : savedDemo ? '✓ Saved' : 'Save Preferences'}
                </button>
              </div>
            </section>

            {/* Privacy */}
            <section className="sett-card p-6">
              <h2 className="text-base font-black text-near-black mb-4">Privacy</h2>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-primary">Show followers & following</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showFollowers}
                  onClick={handleToggleShowFollowers}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-near-black focus:ring-offset-2 ${
                    showFollowers ? 'bg-near-black' : 'bg-gray-border'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      showFollowers ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Danger zone */}
            <section className="sett-card p-6 border border-red-100">
              <h2 className="text-base font-black text-near-black mb-4">Account</h2>
              <button 
                onClick={handleSignOut}
                className="w-full text-sm font-semibold text-red-500 border border-red-200 rounded-[8px] px-5 py-2.5 hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </section>

          </div>
        </div>
      </main>
    </>
  )
}