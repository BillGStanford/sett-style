'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { SiteHeader } from '@/components/layout/site-header'
import { useAuthStore } from '@/lib/store/auth-store'
import Link from 'next/link'

interface Earnings {
  wallet_balance: number
  pending_balance: number
  total_earned: number
  this_week: number
  total_clicks: number
  total_conversions: number
  conversion_rate: number
  top_set: { set_id: string; title: string; clicks: number; revenue: number } | null
  payout_minimum: number
  can_request_payout: boolean
}

export default function DashboardPage() {
  const { isAuthenticated, token } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login')
  }, [isAuthenticated, router])

  const { data: earnings, isLoading } = useQuery<Earnings>({
    queryKey: ['earnings'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commerce/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load earnings')
      return res.json()
    },
    enabled: !!token,
  })

  async function requestPayout() {
    if (!token) return
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commerce/payouts/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) alert('Payout requested! We\'ll process it within 5 business days.')
    else alert('Payout request failed. Try again later.')
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-black text-near-black">Earnings</h1>
          <Link href="/canvas" className="btn-primary text-sm px-5 py-2.5">
            + New Set
          </Link>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : earnings ? (
          <div className="space-y-6">
            {/* Top stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Earned" value={`$${earnings.total_earned.toFixed(2)}`} />
              <StatCard label="This Week" value={`$${earnings.this_week.toFixed(2)}`} highlight />
              <StatCard label="Total Clicks" value={earnings.total_clicks.toLocaleString()} />
              <StatCard label="Conversion Rate" value={`${earnings.conversion_rate.toFixed(1)}%`} />
            </div>

            {/* Balance card */}
            <div className="sett-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-tertiary uppercase tracking-wide font-semibold mb-1">Available Balance</p>
                  <p className="text-4xl font-black text-near-black">${earnings.wallet_balance.toFixed(2)}</p>
                  {earnings.pending_balance > 0 && (
                    <p className="text-xs text-gray-tertiary mt-1">
                      + ${earnings.pending_balance.toFixed(2)} pending (30-60 day confirmation window)
                    </p>
                  )}
                </div>
                <button
                  onClick={requestPayout}
                  disabled={!earnings.can_request_payout}
                  className="btn-primary px-6 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Request Payout
                </button>
              </div>
              {!earnings.can_request_payout && (
                <p className="text-xs text-gray-tertiary border-t border-gray-border pt-4">
                  Minimum payout is ${earnings.payout_minimum}. Keep creating to reach it.
                </p>
              )}
            </div>

            {/* Top performing set */}
            {earnings.top_set && (
              <div className="sett-card p-6">
                <p className="text-xs text-gray-tertiary uppercase tracking-wide font-semibold mb-4">Top Performing Set</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-near-black">{earnings.top_set.title}</p>
                    <p className="text-xs text-gray-tertiary mt-1">
                      {earnings.top_set.clicks} clicks · ${earnings.top_set.revenue.toFixed(2)} earned
                    </p>
                  </div>
                  <Link href={`/sets/${earnings.top_set.set_id}`}
                    className="text-xs font-semibold border border-gray-border rounded-full px-4 py-2 hover:border-near-black transition-colors">
                    View Set
                  </Link>
                </div>
              </div>
            )}

            {/* How earnings work */}
            <div className="sett-card p-6 bg-off-white border-none">
              <p className="text-xs font-semibold text-near-black mb-3">How SETT earnings work</p>
              <div className="space-y-2 text-xs text-gray-primary">
                <p>• Someone clicks a "Shop" button on one of your sets</p>
                <p>• They buy the item through your affiliate link</p>
                <p>• The retailer pays a commission (avg 12%)</p>
                <p>• You keep 70% · SETT keeps 30%</p>
                <p>• Commissions confirm after 30–60 days (retailer return window)</p>
                <p>• Minimum payout: $25 · Processed within 5 business days</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-gray-tertiary">Could not load earnings. Is the API running?</p>
          </div>
        )}
      </main>
    </>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`sett-card p-5 ${highlight ? 'bg-near-black text-white' : ''}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${highlight ? 'text-white/60' : 'text-gray-tertiary'}`}>
        {label}
      </p>
      <p className={`text-2xl font-black ${highlight ? 'text-white' : 'text-near-black'}`}>{value}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sett-card p-5 animate-pulse">
            <div className="h-3 bg-gray-bg rounded w-1/2 mb-3" />
            <div className="h-7 bg-gray-bg rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="sett-card p-6 animate-pulse h-32" />
    </div>
  )
}
