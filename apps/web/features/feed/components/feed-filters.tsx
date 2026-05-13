'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

const AESTHETICS = [
  'All', 'Quiet Luxury', 'Y2K', 'Streetwear', 'Dark Academia',
  'Cottagecore', 'Coastal Cowgirl', 'Minimalist', 'Vintage', 'Athleisure', 'Boho',
]

export function FeedFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const { isAuthenticated } = useAuthStore()
  const active = searchParams.get('aesthetic') ?? 'All'
  const isFollowing = searchParams.get('following') === 'true'

  function handleFilter(tag: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (tag === 'All') params.delete('aesthetic')
    else params.set('aesthetic', tag)
    // If switching to an aesthetic filter, clear the following filter
    if (tag !== 'Following') params.delete('following')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  function handleFollowingFilter() {
    const params = new URLSearchParams(searchParams.toString())
    if (isFollowing) {
      params.delete('following')
    } else {
      params.set('following', 'true')
      // If switching to following filter, clear the aesthetic filter
      params.delete('aesthetic')
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
      {isAuthenticated && (
        <button
          onClick={handleFollowingFilter}
          className={`flex-shrink-0 text-xs font-semibold rounded-full px-4 py-2 border transition-colors ${
            isFollowing
              ? 'bg-near-black text-white border-near-black'
              : 'border-gray-border text-gray-primary hover:border-near-black'
          }`}
        >
          Following
        </button>
      )}
      {AESTHETICS.map((tag) => (
        <button
          key={tag}
          onClick={() => handleFilter(tag)}
          className={`flex-shrink-0 text-xs font-semibold rounded-full px-4 py-2 border transition-colors ${
            active === tag && !isFollowing
              ? 'bg-near-black text-white border-near-black'
              : 'border-gray-border text-gray-primary hover:border-near-black'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}