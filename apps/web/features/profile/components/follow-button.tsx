'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { cn } from '@/lib/utils/cn'

interface FollowButtonProps {
  userId: string
  initialFollowing?: boolean
  onToggle?: (following: boolean) => void
  className?: string
}

/**
 * FollowButton — client component for following/unfollowing a creator.
 * Optimistic UI: updates immediately, reverts on API failure.
 */
export function FollowButton({ userId, initialFollowing = false, onToggle, className }: FollowButtonProps) {
  const { token, isAuthenticated } = useAuthStore()
  const [following, setFollowing] = useState(initialFollowing)
  const [isLoading, setIsLoading] = useState(false)

  async function handleToggle() {
    if (!isAuthenticated || !token) {
      window.location.href = '/auth/login'
      return
    }
    const wasFollowing = following
    setFollowing(!wasFollowing) // optimistic
    setIsLoading(true)

    try {
      const method = wasFollowing ? 'DELETE' : 'POST'
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/follow`,
        { method, headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        setFollowing(wasFollowing) // revert
      } else {
        onToggle?.(!wasFollowing)
      }
    } catch {
      setFollowing(wasFollowing) // revert
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "text-xs font-semibold rounded-full px-4 py-1.5 border transition-all disabled:opacity-50",
        following
          ? "bg-near-black text-white border-near-black hover:bg-gray-primary"
          : "border-gray-border text-near-black hover:border-near-black",
        className
      )}
    >
      {following ? 'Following' : '+ Follow'}
    </button>
  )
}