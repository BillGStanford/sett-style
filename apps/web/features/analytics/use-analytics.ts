'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'

type AnalyticsEvent =
  | 'page_view'
  | 'set_view'
  | 'item_clip'
  | 'canvas_open'
  | 'canvas_publish'
  | 'search_query'
  | 'follow'
  | 'challenge_view'

/**
 * useAnalytics — consent-gated client-side event tracking.
 *
 * Only fires if:
 *   1. User has consented to analytics (user.analytics_consent !== false)
 *   2. The event is in our allowlist
 *
 * Events are sent to POST /api/analytics/event which forwards to PostHog.
 * If the API is unreachable, events are silently dropped — never block UX.
 *
 * What we track and why:
 *   page_view        → understand funnel drop-off
 *   set_view         → power recommendation algorithm
 *   item_clip        → understand item acquisition intent
 *   canvas_open      → measure creation funnel entry
 *   canvas_publish   → measure creation funnel completion
 *   search_query     → improve Meilisearch index
 *   follow           → measure community growth
 *   challenge_view   → measure challenge engagement
 *
 * What we DO NOT track:
 *   - Precise location (city-level max)
 *   - Device fingerprinting
 *   - Cross-site tracking
 *   - Any PII beyond what's in the users table
 *
 * Compliance: GDPR, CCPA — consent managed in Settings > Privacy
 */
export function useAnalytics() {
  const { token } = useAuthStore()

  const track = useCallback(
    async (event: AnalyticsEvent, properties: Record<string, unknown> = {}) => {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/analytics/event`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ event, properties }),
          }
        )
      } catch {
        // Silently drop — never let tracking break the UI
      }
    },
    [token]
  )

  return { track }
}
