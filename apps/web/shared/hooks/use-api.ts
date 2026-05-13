/**
 * API Hooks — typed TanStack Query hooks for all API endpoints.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { 
  SetFeedCard, 
  SetResponse, 
  Item, 
  UserProfile, 
  CreatorEarnings,
  ReferralCodeResponse,
  ReferralStatsResponse,
  ReferredUsersResponse,
  TrendTeaser,
  TrendPeriod,
  TrendTrajectory,
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  MarkReadResponse,
} from '@sett/contracts'
import { useAuthStore } from '@/lib/store/auth-store'

export const queryKeys = {
  feed: (aesthetic?: string, following?: boolean) => ['feed', aesthetic, following],
  set: (id: string) => ['set', id],
  relatedSets: (id: string) => ['sets', 'related', id],
  featuredSets: () => ['sets', 'featured'],
  itemLibrary: () => ['items', 'library'],
  userProfile: (username: string) => ['user', username],
  me: () => ['user', 'me'],
  earnings: () => ['commerce', 'earnings'],
  referralCode: () => ['referrals', 'my-code'],
  referralStats: () => ['referrals', 'stats'],
  referredUsers: (offset: number) => ['referrals', 'users', offset],
  trendsTeaser: () => ['trends', 'teaser'],
  trendsAll: () => ['trends', 'all'],
  trendDetail: (aesthetic: string) => ['trends', 'detail', aesthetic],
  trendTrajectory: (aesthetic: string, days: number) => ['trends', 'trajectory', aesthetic, days],
  notifications: () => ['notifications'],
  notificationsUnread: () => ['notifications', 'unread'],
  privateSets: () => ['sets', 'private'],
  unpublishedItems: () => ['items', 'unpublished'],
} as const

export function useFeed(aesthetic?: string, following?: boolean) {
  return useInfiniteQuery<{ sets: SetFeedCard[]; next_cursor: string | null }>({
    queryKey: queryKeys.feed(aesthetic, following),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/api/sets/feed', {
        params: { cursor: pageParam, aesthetic, following, limit: 20 },
      })
      return data
    },
    initialPageParam: null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 60_000,
  })
}

export function useFeaturedSets() {
  return useQuery<SetFeedCard[]>({
    queryKey: queryKeys.featuredSets(),
    queryFn: async () => {
      const { data } = await api.get('/api/sets/featured')
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useSet(id: string) {
  return useQuery<SetResponse>({
    queryKey: queryKeys.set(id),
    queryFn: async () => {
      const { data } = await api.get(`/api/sets/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useLikeSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (setId: string) => api.post(`/api/sets/${setId}/like`),
    onSuccess: (_, setId) => {
      qc.invalidateQueries({ queryKey: queryKeys.set(setId) })
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

export function useItemLibrary() {
  return useQuery<Item[]>({
    queryKey: queryKeys.itemLibrary(),
    queryFn: async () => {
      const { data } = await api.get('/api/items')
      return data
    },
    refetchInterval: (data) =>
      (data as Item[] | undefined)?.some((i) => i.status === 'processing') ? 5000 : false,
  })
}

export function useClipItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => api.post('/api/items/clip', { url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.itemLibrary() })
    },
  })
}

export function useMe() {
  return useQuery<UserProfile>({
    queryKey: queryKeys.me(),
    queryFn: async () => {
      const { data } = await api.get('/api/users/me')
      return data
    },
    retry: false,
  })
}

export function useEarnings() {
  return useQuery<CreatorEarnings>({
    queryKey: queryKeys.earnings(),
    queryFn: async () => {
      const { data } = await api.get('/api/commerce/earnings')
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useReferralCode(enabled: boolean = true) {
  return useQuery<ReferralCodeResponse>({
    queryKey: queryKeys.referralCode(),
    queryFn: async () => {
      const { data } = await api.get('/api/referrals/my-code')
      return data
    },
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function useReferralStats(enabled: boolean = true) {
  return useQuery<ReferralStatsResponse>({
    queryKey: queryKeys.referralStats(),
    queryFn: async () => {
      const { data } = await api.get('/api/referrals/stats')
      return data
    },
    staleTime: 60_000,
    enabled,
  })
}

export function useReferredUsers(limit: number = 20, offset: number = 0, enabled: boolean = true) {
  return useQuery<ReferredUsersResponse>({
    queryKey: queryKeys.referredUsers(offset),
    queryFn: async () => {
      const { data } = await api.get('/api/referrals/referred-users', {
        params: { limit, offset },
      })
      return data
    },
    staleTime: 60_000,
    enabled,
  })
}

export function useApplyReferralCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => api.post(`/api/referrals/apply/${code}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.me() })
    },
  })
}

// ── Trend Hooks ─────────────────────────────────────────────

export function useTrendsTeaser() {
  return useQuery<TrendTeaser[]>({
    queryKey: queryKeys.trendsTeaser(),
    queryFn: async () => {
      const { data } = await api.get('/api/trends')
      return data
    },
    staleTime: 24 * 60 * 60_000,
  })
}

export function useTrendsAll() {
  return useQuery<TrendPeriod[]>({
    queryKey: queryKeys.trendsAll(),
    queryFn: async () => {
      const { data } = await api.get('/api/trends/all')
      return data
    },
    staleTime: 60 * 60_000,
  })
}

export function useTrendDetail(aesthetic: string) {
  return useQuery<TrendPeriod>({
    queryKey: queryKeys.trendDetail(aesthetic),
    queryFn: async () => {
      const { data } = await api.get(`/api/trends/${encodeURIComponent(aesthetic)}`)
      return data
    },
    enabled: !!aesthetic,
    staleTime: 60 * 60_000,
  })
}

export function useTrendTrajectory(aesthetic: string, days: number = 7) {
  return useQuery<TrendTrajectory>({
    queryKey: queryKeys.trendTrajectory(aesthetic, days),
    queryFn: async () => {
      const { data } = await api.get(`/api/trends/trajectory/${encodeURIComponent(aesthetic)}`, {
        params: { days },
      })
      return data
    },
    enabled: !!aesthetic,
    staleTime: 60 * 60_000,
  })
}

// ── Notification Hooks ──────────────────────────────────────

export function useNotifications(limit: number = 20, offset: number = 0, unreadOnly: boolean = false) {
  const { isAuthenticated, token } = useAuthStore()
  return useQuery<NotificationListResponse>({
    queryKey: [...queryKeys.notifications(), limit, offset, unreadOnly],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications', {
        params: { limit, offset, unread_only: unreadOnly },
      })
      return data
    },
    staleTime: 0,
    refetchInterval: (isAuthenticated && !!token) ? 30_000 : false,
    enabled: isAuthenticated && !!token,
  })
}

export function useUnreadNotificationCount(enabled: boolean = true) {
  const { isAuthenticated, token } = useAuthStore()
  return useQuery<UnreadCountResponse>({
    queryKey: queryKeys.notificationsUnread(),
    queryFn: async () => {
      const { data } = await api.get('/api/notifications/unread-count')
      return data
    },
    staleTime: 0,
    refetchInterval: (isAuthenticated && !!token && enabled) ? 30_000 : false,
    enabled: isAuthenticated && !!token && enabled,
  })
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { notificationIds?: string[]; markAll?: boolean }) => {
      const { data } = await api.post<MarkReadResponse>('/api/notifications/mark-read', {
        notification_ids: params.notificationIds,
        mark_all: params.markAll ?? false,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications() })
      qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread() })
    },
  })
}

export function useMarkSingleNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.post<MarkReadResponse>(`/api/notifications/${notificationId}/read`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications() })
      qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread() })
    },
  })
}

// ── Private Content Hooks ───────────────────────────────────

export interface PrivateSet {
  id: string
  title: string
  slug: string | null
  thumbnail_url: string | null
  aesthetic_tags: string[]
  privacy: "public" | "private" | "unlisted"
  is_published: boolean
  like_count: number
  view_count: number
  created_at: string | null
  updated_at: string | null
}

export function usePrivateSets() {
  const { isAuthenticated, token } = useAuthStore()
  return useQuery<PrivateSet[]>({
    queryKey: queryKeys.privateSets(),
    queryFn: async () => {
      const { data } = await api.get('/api/sets/private')
      return data
    },
    enabled: isAuthenticated && !!token,
    staleTime: 0,
  })
}

export function useUnpublishedItems() {
  const { isAuthenticated, token } = useAuthStore()
  return useQuery<Item[]>({
    queryKey: queryKeys.unpublishedItems(),
    queryFn: async () => {
      const { data } = await api.get('/api/items/unpublished')
      return data
    },
    enabled: isAuthenticated && !!token,
    staleTime: 0,
  })
}

export function useToggleSetPrivacy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ setId, privacy }: { setId: string; privacy: "public" | "private" }) => {
      const { data } = await api.patch(`/api/sets/${setId}/privacy`, { privacy })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.privateSets() })
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}