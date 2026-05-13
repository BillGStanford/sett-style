'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth-store'
import { FollowButton } from './follow-button'
import { FollowsModal } from './follows-modal'
import { cn } from '@/lib/utils/cn'

interface ProfileUser {
  id: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  user_tier?: string
  is_following?: boolean
  followers_count?: number
  following_count?: number
  sets_count?: number
  total_likes?: number
  show_followers?: boolean
}

interface ProfileHeaderProps {
  user: ProfileUser
}

/**
 * TierBadge — Visual indicator for user status
 */
function TierBadge({ tier }: { tier?: string }) {
  const tiers = {
    founder: {
      label: 'Founder',
      classes: 'from-amber-50 to-yellow-50 text-amber-700 border-amber-200/60',
      icon: <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    },
    early_user: {
      label: 'Early',
      classes: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      icon: <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    }
  }

  const current = tiers[tier as keyof typeof tiers]
  if (!current) return null

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r",
      current.classes
    )}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill={tier === 'founder' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
        {current.icon}
      </svg>
      {current.label}
    </span>
  )
}

export function ProfileHeader({ user: initialUser }: ProfileHeaderProps) {
  const { user: authUser, token, updateUser } = useAuthStore()
  
  // Local state to handle optimistic updates for follower counts
  const [user, setUser] = useState(initialUser)
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draftBio, setDraftBio] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isOwnProfile = authUser?.id === user.id

  // Sync draft bio when editing starts
  useEffect(() => {
    if (isEditing) {
      setDraftBio(isOwnProfile ? (authUser?.bio ?? '') : (user.bio ?? ''))
    }
  }, [isEditing, isOwnProfile, authUser?.bio, user.bio])

  async function handleSaveBio() {
    if (!token || !isOwnProfile) return
    setIsSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ bio: draftBio }),
      })
      
      if (res.ok) {
        const updated = await res.json()
        updateUser(updated) // Update global store
        setUser(prev => ({ ...prev, bio: updated.bio })) // Update local state
        setIsEditing(false)
      }
    } catch (err) {
      console.error("Failed to update bio", err)
    } finally {
      setIsSaving(false)
    }
  }

  function handleFollowToggle(isNowFollowing: boolean) {
    setUser(prev => ({
      ...prev,
      is_following: isNowFollowing,
      followers_count: Math.max(0, (prev.followers_count ?? 0) + (isNowFollowing ? 1 : -1)),
    }))
  }

  const bioToDisplay = isOwnProfile ? authUser?.bio : user.bio

  return (
    <>
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 p-2">
        {/* Avatar Section */}
        <div className="relative group shrink-0">
          <div className="absolute -inset-1 bg-gradient-to-tr from-gray-200 to-gray-50 rounded-full blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-32 h-32 rounded-full bg-white p-1 shadow-xl">
            <div className="w-full h-full rounded-full bg-gray-50 overflow-hidden border border-gray-100">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.username ?? 'Profile'} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-3xl">
                  {user.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 text-center md:text-left min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
            <h1 className="text-3xl font-black text-near-black tracking-tight">
              @{user.username}
            </h1>
            <div className="flex justify-center md:justify-start items-center gap-2">
              <TierBadge tier={isOwnProfile ? authUser?.user_tier : user.user_tier} />
              {user.location && (
                <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  {user.location}
                </span>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div className="mb-6 max-w-lg mx-auto md:mx-0">
            {isEditing ? (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-inner">
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className="w-full bg-transparent text-sm text-near-black placeholder-gray-400 focus:outline-none resize-none"
                  placeholder="What's your style story?"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-200/50">
                  <span className={cn("text-[10px] font-mono", draftBio.length >= 190 ? "text-red-500" : "text-gray-400")}>
                    {draftBio.length}/200
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs font-semibold text-gray-500">Cancel</button>
                    <button 
                      onClick={handleSaveBio} 
                      disabled={isSaving}
                      className="bg-near-black text-white text-xs font-bold px-4 py-1.5 rounded-full disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="group relative">
                <p className="text-[15px] leading-relaxed text-gray-600">
                  {bioToDisplay || (isOwnProfile ? "No bio yet. Click edit to add one." : "")}
                </p>
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-2 flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-near-black transition-opacity md:opacity-0 md:group-hover:opacity-100"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    Edit Bio
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats Section */}
          <div className="flex items-center justify-center md:justify-start gap-8">
            <StatBox 
              value={user.followers_count} 
              label="Followers" 
              onClick={() => setModalType('followers')} 
            />
            <StatBox 
              value={user.following_count} 
              label="Following" 
              onClick={() => setModalType('following')} 
            />
            <StatBox value={user.sets_count} label="Sets" />
            <StatBox value={user.total_likes} label="Likes" />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0">
          {!isOwnProfile ? (
            <FollowButton
              userId={user.id}
              initialFollowing={user.is_following}
              onToggle={handleFollowToggle}
              className="px-8 py-2 text-sm"
            />
          ) : (
            <Link 
              href="/settings" 
              className="inline-flex items-center gap-2 text-sm font-bold border border-gray-border px-6 py-2 rounded-full hover:bg-gray-50 transition-all active:scale-95"
            >
              Settings
            </Link>
          )}
        </div>
      </div>

      {modalType && (
        <FollowsModal
          username={user.username ?? ''}
          type={modalType}
          isOwnProfile={isOwnProfile}
          showFollowers={user.show_followers ?? true}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  )
}

function StatBox({ value, label, onClick }: { value?: number; label: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex flex-col items-center md:items-start transition-all",
        onClick ? "hover:opacity-70 active:scale-95 cursor-pointer" : "cursor-default"
      )}
    >
      <span className="text-xl font-black text-near-black">
        {value?.toLocaleString() ??  0}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </span>
    </button>
  )
}