import { Metadata } from 'next'
import { Suspense } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { FeedGrid } from '@/features/feed/components/feed-grid'
import { FeedFilters } from '@/features/feed/components/feed-filters'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Explore — SETT',
  description: 'Discover shoppable fashion sets from creators. Every look is ready to shop.',
}

interface FeedPageProps {
  searchParams: { aesthetic?: string; following?: string }
}

export default function FeedPage({ searchParams }: FeedPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-near-black">Explore</h1>
          <Link href="/canvas" className="btn-primary text-sm px-5 py-2.5">
            + Create Set
          </Link>
        </div>
        {/* FeedFilters needs useSearchParams — wrap in Suspense */}
        <Suspense fallback={<div className="h-10" />}>
          <FeedFilters />
        </Suspense>
        <FeedGrid
          aesthetic={searchParams.aesthetic}
          following={searchParams.following === 'true'}
        />
      </main>
    </>
  )
}