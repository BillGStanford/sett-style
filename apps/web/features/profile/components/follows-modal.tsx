'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FollowUser {
  id: string
  username: string | null
  avatar_url: string | null
}

interface FollowsModalProps {
  username: string
  type: 'followers' | 'following'
  count: number
  isOwnProfile: boolean
  showFollowers: boolean
  onClose: () => void
}

export function FollowsModal({ username, type, isOwnProfile, showFollowers, onClose }: FollowsModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // If it's not the own profile and they have it hidden, don't fetch
    if (!isOwnProfile && !showFollowers) return
    
    setIsLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/@${username}/${type}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setUsers(data))
      .finally(() => setIsLoading(false))
  }, [username, type, isOwnProfile, showFollowers])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-border">
          <h2 className="text-base font-black text-near-black">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-near-black transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {!isOwnProfile && !showFollowers ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 bg-gray-bg rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-near-black">Hidden</p>
              <p className="text-xs text-gray-tertiary mt-1">@{username} has hidden their {type}.</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-gray-border border-t-near-black rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-sm font-semibold text-near-black">No {type} yet</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {users.map(u => (
                <Link key={u.id} href={u.username ? `/profile/${u.username}` : '#'} onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gray-bg overflow-hidden flex-shrink-0 border border-gray-border/50">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-sm">
                        {u.username?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-near-black truncate">
                    @{u.username ?? 'user'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}