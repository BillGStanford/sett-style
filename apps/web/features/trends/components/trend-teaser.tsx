'use client'

import Link from 'next/link'
import { useTrendsTeaser } from '@/shared/hooks/use-api'
import { useAuthStore } from '@/lib/store/auth-store'

function TrendArrow({ isUp }: { isUp: boolean }) {
  if (isUp) {
    return (
      <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function TrendTeaser() {
  const { data: trends, isLoading } = useTrendsTeaser()
  const { isAuthenticated } = useAuthStore()

  if (isLoading || !trends || trends.length === 0) return null

  // Only show teasers with meaningful positive movement
  const rising = trends.filter(t => t.overall_percent_change > 10)
  if (rising.length === 0) return null

  const primary = rising[0]
  const href = isAuthenticated ? '/trends' : '/auth?next=/trends'

  return (
    <section className="py-16 bg-gradient-to-b from-white via-gray-bg/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-8">
          <svg className="w-5 h-5 text-near-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <h2 className="text-lg font-black text-near-black">Trending Now</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rising.slice(0, 3).map((trend, i) => (
            <Link key={trend.aesthetic} href={href} className="group">
              <div className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                i === 0 
                  ? 'border-green-200 bg-green-50/50 hover:border-green-400 hover:shadow-lg hover:shadow-green-100' 
                  : 'border-gray-border bg-white hover:border-near-black hover:shadow-lg'
              }`}>
                {i === 0 && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1">
                    Hot
                  </div>
                )}
                <div className="p-6">
                  <p className="text-sm font-semibold text-near-black mb-2 group-hover:underline">
                    {trend.aesthetic}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <TrendArrow isUp={trend.overall_percent_change > 0} />
                    <span className={`text-2xl font-black tabular-nums ${
                      trend.overall_percent_change > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {trend.overall_percent_change > 0 ? '+' : ''}{trend.overall_percent_change}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-tertiary mt-2">
                    {trend.period_label} · {trend.top_metric}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href={href} className="text-sm font-semibold text-near-black underline underline-offset-4 hover:text-gray-primary transition-colors">
            See all trends →
          </Link>
        </div>
      </div>
    </section>
  )
}