'use client'

import { useMemo } from 'react'
import type { TrendTrajectoryPoint } from '@sett/contracts'

interface TrendTrajectoryChartProps {
  data: TrendTrajectoryPoint[]
  color?: string
  height?: number
  showDots?: boolean
}

export function TrendTrajectoryChart({
  data,
  color = '#171717',
  height = 120,
  showDots = false,
}: TrendTrajectoryChartProps) {
  const { path, areaPath, dots, xLabels, maxValue, minY } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: '', areaPath: '', dots: [], xLabels: [], maxValue: 1, minY: 0 }
    }

    const padding = { top: 8, right: 8, bottom: 20, left: 8 }
    const chartWidth = 300 - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    const values = data.map(d => d.count)
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const range = max - min || 1

    const stepX = chartWidth / (data.length - 1)

    const points = data.map((d, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + chartHeight - ((d.count - min) / range) * chartHeight,
    }))

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`

    const dotPositions = points.map((p, i) => ({
      cx: p.x,
      cy: p.y,
      label: data[i].date.slice(5), // MM-DD
    }))

    // Show ~4 labels max
    const labelInterval = Math.ceil(data.length / 4)
    const labels = dotPositions.filter((_, i) => i % labelInterval === 0 || i === data.length - 1)

    return {
      path: linePath,
      areaPath,
      dots: showDots ? dotPositions : [],
      xLabels: labels,
      maxValue: max,
      minY: min,
    }
  }, [data, height, showDots])

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-gray-tertiary" style={{ height }}>
        No data yet
      </div>
    )
  }

  return (
    <svg viewBox={`0 0 300 ${height}`} className="w-full" preserveAspectRatio="none">
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaPath} fill={`url(#gradient-${color.replace('#', '')})`} />

      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r="3" fill="white" stroke={color} strokeWidth="2" />
      ))}

      {/* X-axis labels */}
      {xLabels.map((label, i) => (
        <text key={i} x={label.cx} y={height - 2} textAnchor="middle" className="text-[9px] fill-gray-400" style={{ fontSize: '9px' }}>
          {label.label}
        </text>
      ))}
    </svg>
  )
}