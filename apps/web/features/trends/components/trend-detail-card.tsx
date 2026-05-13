'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TrendTrajectoryChart } from './trend-trajectory-chart'
import type { TrendPeriod } from '@sett/contracts'

interface TrendDetailCardProps {
  trend: TrendPeriod
  defaultExpanded?: boolean
}

const METRIC_COLORS: Record<string, string> = {
  likes: '#EF4444',
  saves: '#3B82F6',
  searches: '#F59E0B',
  tags: '#8B5CF6',
}

const METRIC_LABELS: Record<string, string> = {
  likes: 'Likes',
  saves: 'Sets Created',
  searches: 'Shop Clicks',
  tags: 'Times Tagged',
}

export function TrendDetailCard({ trend, defaultExpanded = false }: TrendDetailCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isUp = trend.overall_percent_change > 0

  // Get the top metric for the sparkline preview
  const likesMetric = trend.metrics.find(m => m.metric_type === 'likes')
  const savesMetric = trend.metrics.find(m => m.metric_type === 'saves')

  return (
    <div className="border border-gray-border rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-black text-near-black">{trend.aesthetic}</h3>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 px-2 py-0.5 rounded-full ${
              isUp 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-600'
            }`}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d={isUp ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
              </svg>
              {isUp ? '+' : ''}{trend.overall_percent_change}% this week
            </span>
          </div>
          
          {/* Mini sparkline preview (likes) */}
          {likesMetric && likesMetric.trajectory.length > 1 && !expanded && (
            <div className="w-24 h-10">
              <TrendTrajectoryChart 
                data={likesMetric.trajectory} 
                color={METRIC_COLORS.likes}
                height={40}
              />
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          {trend.metrics.slice(0, 2).map(metric => (
            <div key={metric.metric_type} className="bg-gray-bg rounded-xl p-3">
              <p className="text-[11px] text-gray-tertiary uppercase tracking-wide mb-0.5">
                {METRIC_LABELS[metric.metric_type]}
              </p>
              <p className="text-lg font-bold text-near-black tabular-nums">
                {metric.current_count.toLocaleString()}
              </p>
              <p className={`text-xs font-medium tabular-nums ${
                metric.percent_change > 0 ? 'text-green-600' : 'text-red-500'
              }`}>
                {metric.percent_change > 0 ? '+' : ''}{metric.percent_change}%
              </p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-gray-primary underline underline-offset-2 hover:text-near-black transition-colors"
          >
            {expanded ? 'Show less' : 'View details'}
          </button>
          <Link
            href={`/feed?aesthetic=${encodeURIComponent(trend.aesthetic)}`}
            className="text-xs font-bold bg-near-black text-white px-4 py-2 rounded-full hover:bg-black transition-colors"
          >
            Steal This Look
          </Link>
        </div>
      </div>

      {/* Expanded: Full charts */}
      {expanded && (
        <div className="border-t border-gray-border bg-gray-bg/30 p-5 space-y-6">
          {trend.metrics.map(metric => (
            <div key={metric.metric_type}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-near-black">
                    {METRIC_LABELS[metric.metric_type]}
                  </p>
                  <p className="text-xs text-gray-tertiary">
                    {metric.current_count.toLocaleString()} this week
                    <span className="mx-1.5">·</span>
                    {metric.previous_count.toLocaleString()} prior week
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${
                  metric.percent_change > 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {metric.percent_change > 0 ? '+' : ''}{metric.percent_change}%
                </span>
              </div>
              <TrendTrajectoryChart
                data={metric.trajectory}
                color={METRIC_COLORS[metric.metric_type]}
                height={100}
                showDots
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}