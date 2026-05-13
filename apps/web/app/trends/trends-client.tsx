'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTrendsAll } from '@/shared/hooks/use-api'
import { useAuthStore } from '@/lib/store/auth-store'
import { TrendDetailCard } from '@/features/trends/components/trend-detail-card'
import type { TrendPeriod } from '@sett/contracts'

interface TrendsClientProps {
  initialTrends: TrendPeriod[]
}

export function TrendsClient({ initialTrends }: TrendsClientProps) {
  const { data: trends } = useTrendsAll()
  const { isAuthenticated, isAuthReady } = useAuthStore()
  const router = useRouter()
  
  const allTrends = trends ?? initialTrends
  const [filter, setFilter] = useState<'all' | 'rising' | 'falling'>('all')

  // Client-side auth gate: Don't render data unless ready and authenticated
  if (isAuthReady && !isAuthenticated) {
    return (
      <div className="text-center py-24 border border-dashed border-gray-border rounded-2xl">
        <h2 className="text-xl font-black text-near-black mb-3">Sign in to view Trend Signals</h2>
        <p className="text-sm text-gray-tertiary mb-6 max-w-md mx-auto">
          See which aesthetics are rising on SETT and get ahead of the curve.
        </p>
        <button 
          onClick={() => router.push('/auth/login?next=/trends')}
          className="btn-primary text-sm px-6 py-3"
        >
          Sign In
        </button>
      </div>
    )
  }

  const filtered = allTrends.filter(t => {
    if (filter === 'rising') return t.overall_percent_change > 0
    if (filter === 'falling') return t.overall_percent_change < 0
    return true
  })

  return (
    <>
      {/* Filter pills */}
      <div className="flex gap-2 mb-8">
        {(['all', 'rising', 'falling'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold rounded-full px-4 py-2 border transition-colors capitalize ${
              filter === f
                ? 'bg-near-black text-white border-near-black'
                : 'border-gray-border text-gray-primary hover:border-near-black'
            }`}
          >
            {f === 'all' ? 'All Trends' : f === 'rising' ? '↑ Rising' : '↓ Falling'}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 border border-dashed border-gray-border rounded-2xl">
          <p className="text-sm font-semibold text-near-black mb-1">No trends yet</p>
          <p className="text-xs text-gray-tertiary">Trend data populates as users create, like, and shop sets.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 gap-6">
        {filtered.map(trend => (
          <TrendDetailCard key={trend.aesthetic} trend={trend} />
        ))}
      </div>
    </>
  )
}