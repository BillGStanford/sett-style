import { Metadata } from 'next'
import { Suspense } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { cookies } from 'next/headers'
import { TrendsClient } from './trends-client'

export const metadata: Metadata = {
  title: 'Trend Signals — SETT',
  description: 'See which aesthetics are trending on SETT. Track likes, saves, and searches in real time.',
}

async function getServerToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    // Safely extract the token directly from cookies without initializing
    // the Supabase client. Initializing the client in a Server Component
    // can trigger token refreshes that fail to save (because setAll is a no-op),
    // which permanently consumes the refresh token and logs the user out.
    const allCookies = cookieStore.getAll()
    const authCookie = allCookies.find(
      (c) => c.name.includes('-auth-token') && c.value.startsWith('eyJ')
    )
    return authCookie?.value ?? null
  } catch {
    return null
  }
}

async function getTrendsData(token: string | null) {
  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/trends/all`,
      { headers, cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function TrendsPage() {
  const token = await getServerToken()
  const trends = await getTrendsData(token)

  return (
    <>
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-6 h-6 text-near-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <h1 className="text-3xl font-black text-near-black">Trend Signals</h1>
          </div>
          <p className="text-sm text-gray-tertiary max-w-xl">
            See which aesthetics are rising on SETT. Data updates daily from likes, saves, and shopping activity across the platform.
          </p>
        </div>

        <Suspense fallback={<TrendsSkeleton />}>
          <TrendsClient initialTrends={trends} />
        </Suspense>
      </main>
    </>
  )
}

function TrendsSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-gray-border rounded-2xl p-5 animate-pulse">
          <div className="h-6 bg-gray-bg rounded w-1/2 mb-3" />
          <div className="h-4 bg-gray-bg rounded w-1/4 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-gray-bg rounded-xl" />
            <div className="h-16 bg-gray-bg rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}