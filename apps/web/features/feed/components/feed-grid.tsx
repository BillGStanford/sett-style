'use client'

import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store/auth-store'
import { LikeButton } from '@/features/sets/components/like-button'
import Link from 'next/link'
import React from 'react'

interface FeedSet {
  id: string
  title: string
  thumbnail_url: string | null
  creator: { id: string; username: string | null; avatar_url: string | null }
  like_count: number
  is_liked: boolean
  aesthetic_tags: string[]
  section?: 'following' | 'algorithmic'
  relevance_score?: number
}

export function FeedGrid({ aesthetic, following }: { aesthetic?: string; following?: boolean }) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { token } = useAuthStore()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<{ sets: FeedSet[]; next_cursor: string | null }>({
      queryKey: ['feed', aesthetic, following],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({ limit: '20' })
        if (pageParam) params.set('cursor', pageParam as string)
        if (aesthetic && aesthetic !== 'All') params.set('aesthetic', aesthetic)
        if (following) params.set('following', 'true')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sets/feed?${params}`,
          { headers }
        )
        if (!res.ok) return { sets: [], next_cursor: null }
        const items = await res.json()
        // API returns an array; wrap into cursor-page shape
        return { sets: Array.isArray(items) ? items : [], next_cursor: null }
      },
      initialPageParam: null,
      getNextPageParam: (last) => last.next_cursor ?? undefined,
    })

  const sets = data?.pages.flatMap((p) => p.sets) ?? []
  
  // Find the index where the algorithmic section starts
  const dividerIndex = sets.findIndex((set, index) => 
    set.section === 'algorithmic' && index > 0 && sets[index - 1].section === 'following'
  )

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNextPage() },
      { rootMargin: '300px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage])

  if (isLoading) return <FeedSkeleton />

  if (sets.length === 0) {
    return (
      <div className="text-center py-24 border border-dashed border-gray-border rounded-[12px]">
        <p className="text-sm font-semibold text-near-black mb-2">Nothing here yet.</p>
        <p className="text-xs text-gray-tertiary mb-6">Be the first creator to publish a set.</p>
        <Link href="/canvas" className="btn-primary text-sm px-6 py-3 inline-block">
          Start Creating
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="feed-grid">
        {sets.map((set, index) => (
          <React.Fragment key={set.id}>
            {index === dividerIndex && (
              <div className="col-span-full flex items-center gap-4 py-8">
                <div className="flex-1 h-px bg-gray-border" />
                <p className="text-xs font-semibold text-gray-tertiary whitespace-nowrap">You're all caught up</p>
                <div className="flex-1 h-px bg-gray-border" />
              </div>
            )}
            <FeedSetCard set={set} />
          </React.Fragment>
        ))}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-gray-border border-t-near-black rounded-full animate-spin" />
        </div>
      )}
    </>
  )
}

function FeedSetCard({ set }: { set: FeedSet }) {
  const isRecommended = (set.relevance_score ?? 0) > 0 && set.section === 'algorithmic'

  return (
    <article className="set-card group">
      <Link href={`/sets/${set.id}`} className="block">
        <div className="aspect-square bg-gray-bg relative overflow-hidden">
          {isRecommended && (
            <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm text-near-black text-[10px] font-semibold rounded-full px-2.5 py-1 shadow-sm">
              Recommended for you
            </div>
          )}
          {set.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={set.thumbnail_url} alt={set.title}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-gray-tertiary px-3 text-center">{set.title}</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-gradient-to-t from-near-black/80 to-transparent p-4 pt-8">
            <span className="text-white text-xs font-semibold">Steal This Look →</span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-near-black mb-1 truncate">{set.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-tertiary">@{set.creator?.username ?? 'creator'}</span>
            <LikeButton
              setId={set.id}
              initialLiked={set.is_liked}
              initialCount={set.like_count}
            />
          </div>
          {(set.aesthetic_tags ?? []).length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {set.aesthetic_tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-xs bg-gray-bg text-gray-primary rounded-full px-2 py-0.5">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  )
}

function FeedSkeleton() {
  return (
    <div className="feed-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="sett-card animate-pulse">
          <div className="aspect-square bg-gray-bg" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-gray-bg rounded w-3/4" />
            <div className="h-3 bg-gray-bg rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}