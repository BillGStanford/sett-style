'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth-store'
import { SettLogo } from '@/components/ui/sett-logo'
import { useState, useRef, useEffect } from 'react'
import { 
  useNotifications, 
  useUnreadNotificationCount, 
  useMarkNotificationsRead,
  useMarkSingleNotificationRead 
} from '@/shared/hooks/use-api'
import { timeAgo } from '@/shared/lib'
import type { Notification } from '@sett/contracts'

export function SiteHeader() {
  const { isAuthenticated, user } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Notification queries
  const { data: notifData } = useNotifications(10, 0)
  const { data: unreadData } = useUnreadNotificationCount(isAuthenticated)
  const markRead = useMarkNotificationsRead()
  const markSingleRead = useMarkSingleNotificationRead()

  const unreadCount = unreadData?.count ?? 0
  const notifications = notifData?.notifications ?? []

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleNotifClick(notification: Notification) {
    if (!notification.is_read) {
      markSingleRead.mutate(notification.id)
    }

    // Navigate based on notification type
    if (notification.entity_type === 'set' && notification.entity_id) {
      window.location.href = `/sets/${notification.entity_id}`
    } else if (notification.type === 'follow' && notification.actor) {
      window.location.href = `/profile/${notification.actor.username}`
    } else if (notification.actor?.username) {
      window.location.href = `/profile/${notification.actor.username}`
    }

    setNotifOpen(false)
  }

  function handleMarkAllRead() {
    markRead.mutate({ markAll: true })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-border/50 bg-white/80 backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
            <SettLogo className="h-7" />
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {isAuthenticated && (
              <Link href="/?browse" className="px-4 py-2 text-sm font-medium text-gray-primary hover:text-near-black hover:bg-gray-100/50 rounded-full transition-all">
                Browse
              </Link>
            )}
            <Link href="/feed" className="px-4 py-2 text-sm font-medium text-gray-primary hover:text-near-black hover:bg-gray-100/50 rounded-full transition-all">
              Explore
            </Link>
            <Link href="/trends" className="px-4 py-2 text-sm font-medium text-gray-primary hover:text-near-black hover:bg-gray-100/50 rounded-full transition-all">
              Trends
            </Link>
            <Link href="/challenges" className="px-4 py-2 text-sm font-medium text-gray-primary hover:text-near-black hover:bg-gray-100/50 rounded-full transition-all">
              Challenges
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(v => !v)}
                    className="relative p-2 rounded-full hover:bg-gray-100/50 transition-colors"
                    aria-label="Notifications"
                  >
                    <svg className="w-5 h-5 text-gray-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-gray-border/50 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-near-black">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            disabled={markRead.isPending}
                            className="text-xs font-medium text-gray-400 hover:text-near-black transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Notification List */}
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <svg className="w-10 h-10 mx-auto text-gray-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-sm text-gray-400">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <NotificationItem
                              key={notif.id}
                              notification={notif}
                              onClick={() => handleNotifClick(notif)}
                            />
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      {notifData?.has_more && (
                        <div className="border-t border-gray-100 px-4 py-2">
                          <button 
                            onClick={() => {
                              window.location.href = '/notifications'
                            }}
                            className="w-full text-center text-xs font-medium text-gray-400 hover:text-near-black transition-colors py-1"
                          >
                            View all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Link href="/canvas"
                  className="hidden sm:flex items-center gap-2 text-sm font-bold bg-near-black text-white px-5 py-2.5 rounded-full hover:bg-black hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all active:translate-y-0">
                  <span className="text-lg leading-none">+</span> Create
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="group flex items-center p-0.5 rounded-full transition-all ring-offset-2 hover:ring-2 hover:ring-gray-200"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-900 to-gray-600 text-white flex items-center justify-center text-xs font-bold shadow-md group-hover:shadow-lg transition-shadow">
                      {(user.username ?? user.email)?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-12 w-56 bg-white border border-gray-border/50 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-5 py-3 border-b border-gray-100 mb-1">
                        <p className="text-sm font-bold text-near-black truncate">
                          @{user.username ?? 'setting up…'}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate tracking-wide">{user.email}</p>
                      </div>

                      {user.username && (
                        <Link href={`/profile/${user.username}`} onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-near-black transition-colors group">
                          <svg className="text-gray-400 group-hover:text-near-black" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                          </svg>
                          My Profile
                        </Link>
                      )}

                      <Link href="/canvas" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-near-black transition-colors group">
                        <svg className="text-gray-400 group-hover:text-near-black" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        New Set
                      </Link>

                      <Link href="/trends" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-near-black transition-colors group">
                        <svg className="text-gray-400 group-hover:text-near-black" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                        Trend Signals
                      </Link>

                      <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-near-black transition-colors group">
                        <svg className="text-gray-400 group-hover:text-near-black" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>
                        </svg>
                        Earnings
                      </Link>

                      <Link href="/referrals" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-near-black transition-colors group">
                        <svg className="text-gray-400 group-hover:text-near-black" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                        Refer & Earn
                      </Link>

                      <Link href="/settings" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-near-black transition-colors group">
                        <svg className="text-gray-400 group-hover:text-near-black" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                        </svg>
                        Settings
                      </Link>

                      <div className="border-t border-gray-100 mt-2 pt-1">
                        <SignOutButton onClose={() => setMenuOpen(false)} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login"
                  className="hidden sm:block text-sm font-semibold text-gray-primary hover:text-near-black px-4 py-2 transition-colors">
                  Sign In
                </Link>
                <Link href="/auth"
                  className="text-sm font-bold bg-near-black text-white px-6 py-2.5 rounded-full hover:bg-black hover:shadow-lg hover:shadow-black/10 transition-all active:scale-95">
                  Start Styling
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function SignOutButton({ onClose }: { onClose: () => void }) {
  const { clearAuth } = useAuthStore()

  async function handleSignOut() {
    onClose()
    try {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      await getSupabaseClient().auth.signOut()
    } catch {}
    clearAuth()
    window.location.href = '/'
  }

  return (
    <button onClick={handleSignOut}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors group">
      <svg className="transition-transform group-hover:translate-x-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
      </svg>
      Sign Out
    </button>
  )
}

// ── Notification Item Component ─────────────────────────────

function NotificationItem({ 
  notification, 
  onClick 
}: { 
  notification: Notification
  onClick: () => void 
}) {
  const { actor, message, is_read, created_at, type } = notification

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
        !is_read ? 'bg-blue-50/50' : ''
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {actor?.avatar_url ? (
          <img 
            src={actor.avatar_url} 
            alt={actor.username ?? ''} 
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <NotificationIcon type={type} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-primary">
          {actor?.username && (
            <span className="font-semibold text-near-black">{actor.username}</span>
          )}
          {' '}
          {message}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {timeAgo(new Date(created_at))}
        </p>
      </div>

      {/* Unread indicator */}
      {!is_read && (
        <div className="flex-shrink-0 mt-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        </div>
      )}
    </button>
  )
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'follow':
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    case 'like':
      return (
        <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    case 'new_set':
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      )
    case 'remix':
      return (
        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    default:
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
  }
}