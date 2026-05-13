'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { useQueryClient } from '@tanstack/react-query'

interface LikeButtonProps {
  setId: string
  initialLiked: boolean
  initialCount: number
  size?: 'sm' | 'md'
  showCount?: boolean
  className?: string
}

export function LikeButton({ 
  setId, 
  initialLiked, 
  initialCount, 
  size = 'sm', 
  showCount = true,
  className = '' 
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  // Sync state if props change (e.g., after query invalidation)
  const currentLiked = initialLiked
  const currentCount = initialCount

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading || !isAuthenticated || !token) return
    
    setIsLoading(true)
    
    // Optimistic update
    const previousLiked = liked
    const previousCount = count
    setLiked(!liked)
    setCount(liked ? count - 1 : count + 1)
    
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sets/${setId}/like`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (!res.ok) {
        // Revert on error
        setLiked(previousLiked)
        setCount(previousCount)
      } else {
        // Invalidate queries to sync state across the app
        queryClient.invalidateQueries({ queryKey: ['feed'] })
        queryClient.invalidateQueries({ queryKey: ['set', setId] })
      }
    } catch {
      // Revert on network error
      setLiked(previousLiked)
      setCount(previousCount)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isAuthenticated, token, liked, count, setId, queryClient])

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={`flex items-center gap-1 group/like transition-opacity ${isLoading ? 'opacity-50' : ''} ${className}`}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <svg
        className={`${iconSize} transition-colors duration-150 ${liked ? 'text-red-500' : 'text-gray-tertiary group-hover/like:text-near-black'}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        fill={liked ? 'currentColor' : 'none'}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showCount && (
        <span className={`text-xs tabular-nums ${liked ? 'text-red-500 font-medium' : 'text-gray-tertiary'}`}>
          {count > 0 ? count.toLocaleString() : ''}
        </span>
      )}
    </button>
  )
}