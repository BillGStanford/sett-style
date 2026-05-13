'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/layout/site-header'
import { useAuthStore } from '@/lib/store/auth-store'
import { useReferralCode, useReferralStats, useReferredUsers } from '@/shared/hooks/use-api'

export default function ReferralsPage() {
  const { isAuthenticated, isAuthReady } = useAuthStore()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview')

  const { data: codeData } = useReferralCode(isAuthReady && isAuthenticated)
  const { data: statsData } = useReferralStats(isAuthReady && isAuthenticated)
  const { data: usersData } = useReferredUsers(20, 0, isAuthReady && isAuthenticated)

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) router.push('/auth/login')
  }, [isAuthenticated, isAuthReady, router])

  async function handleCopyLink() {
    if (!codeData?.share_url) return
    try {
      await navigator.clipboard.writeText(codeData.share_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = codeData.share_url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleShareTwitter() {
    if (!codeData?.share_url) return
    const text = encodeURIComponent(
      `Check out SETT — style it, share it, shop it. Create fashion collages and earn from every click! 🎨✨ ${codeData.share_url}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  function handleShareCopyLink() {
    handleCopyLink()
  }

  if (!isAuthReady) return null

  const stats = statsData ?? {
    total_referred: 0,
    referred_this_week: 0,
    referred_this_month: 0,
    active_referred_users: 0,
    total_bonus_earned: 0,
    bonus_this_month: 0,
    bonus_rate: 10,
    attribution_window_days: 30,
  }

  const users = usersData?.users ?? []
  const totalUsers = usersData?.total ?? 0

  return (
    <>
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-near-black mb-2">Refer & Earn</h1>
          <p className="text-gray-primary">
            Earn a {stats.bonus_rate}% bonus on all commissions from creators you refer — for 30 days after they sign up.
          </p>
        </div>

        <div className="sett-card p-6 mb-8 bg-gradient-to-br from-near-black to-gray-800 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-300 mb-1">Your Referral Link</p>
              <p className="text-lg font-mono font-bold break-all">
                {codeData?.share_url ?? 'Loading...'}
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex-shrink-0 bg-white text-near-black font-semibold px-6 py-3 rounded-[12px] hover:bg-gray-100 transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleShareTwitter}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-[8px] text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X
            </button>
            <button
              onClick={handleShareCopyLink}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-[8px] text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              Copy
            </button>
          </div>
        </div>

        <div className="sett-card p-6 mb-8">
          <h2 className="text-lg font-black text-near-black mb-4">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-black">1</span>
              </div>
              <h3 className="text-sm font-bold text-near-black mb-1">Share Your Link</h3>
              <p className="text-xs text-gray-primary">
                Send your unique referral link to friends, followers, or anyone who loves fashion.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-black">2</span>
              </div>
              <h3 className="text-sm font-bold text-near-black mb-1">They Sign Up</h3>
              <p className="text-xs text-gray-primary">
                When someone creates an account using your link, they&apos;re tracked as your referral.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-black">3</span>
              </div>
              <h3 className="text-sm font-bold text-near-black mb-1">Earn Bonus</h3>
              <p className="text-xs text-gray-primary">
                For 30 days, you earn {stats.bonus_rate}% of every commission they generate from their sets.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-bg rounded-[10px] p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-[8px] transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-near-black shadow-sm'
                : 'text-gray-primary hover:text-near-black'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-[8px] transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-near-black shadow-sm'
                : 'text-gray-primary hover:text-near-black'
            }`}
          >
            Referred Users ({totalUsers})
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Referred"
              value={stats.total_referred}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              }
            />
            <StatCard
              label="This Month"
              value={stats.referred_this_month}
              subtitle={`+${stats.referred_this_week} this week`}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              }
            />
            <StatCard
              label="Active Creators"
              value={stats.active_referred_users}
              subtitle="Published at least 1 set"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              }
            />
            <StatCard
              label="Bonus Earned"
              value={`$${stats.total_bonus_earned.toFixed(2)}`}
              subtitle={`$${stats.bonus_this_month.toFixed(2)} this month`}
              accent
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              }
            />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="sett-card">
            {users.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-bg flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-tertiary">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <h3 className="text-base font-bold text-near-black mb-1">No referrals yet</h3>
                <p className="text-sm text-gray-primary">
                  Share your referral link to start earning bonus commissions!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-border">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-near-black text-white flex items-center justify-center text-sm font-bold">
                        {user.username?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-near-black">
                          @{user.username ?? 'setting up...'}
                        </p>
                        <p className="text-xs text-gray-tertiary">
                          Joined {new Date(user.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-near-black">
                        {user.sets_published} {user.sets_published === 1 ? 'set' : 'sets'}
                      </p>
                      <p className="text-xs text-green-600">
                        ${user.total_earned.toFixed(2)} earned
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="sett-card p-6 mt-8">
          <h2 className="text-lg font-black text-near-black mb-4">FAQ</h2>
          <div className="space-y-4">
            <FAQItem
              question="How long does the referral bonus last?"
              answer={`You earn a ${stats.bonus_rate}% bonus on all commissions generated by your referred users for ${stats.attribution_window_days} days after they sign up.`}
            />
            <FAQItem
              question="What counts as a commission?"
              answer="When someone clicks a product link in a set and makes a purchase, the set creator earns a commission. You get a percentage of that commission as a bonus."
            />
            <FAQItem
              question="Is there a limit to how many people I can refer?"
              answer="No! There's no limit to the number of people you can refer. The more active creators you bring in, the more you earn."
            />
            <FAQItem
              question="When do I get paid my referral bonus?"
              answer="Referral bonuses are added to your wallet balance after the standard 60-day affiliate confirmation window. You can request a payout once you reach the minimum threshold."
            />
          </div>
        </div>
      </main>
    </>
  )
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent = false,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className={`sett-card p-5 ${accent ? 'border-green-200 bg-green-50/50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold uppercase tracking-wider ${accent ? 'text-green-700' : 'text-gray-tertiary'}`}>
          {label}
        </span>
        <span className={accent ? 'text-green-600' : 'text-gray-tertiary'}>{icon}</span>
      </div>
      <p className={`text-2xl font-black ${accent ? 'text-green-700' : 'text-near-black'}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-tertiary mt-1">{subtitle}</p>}
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-near-black mb-1">{question}</h3>
      <p className="text-sm text-gray-primary">{answer}</p>
    </div>
  )
}