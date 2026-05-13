import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store/auth-store'

interface LibraryItem {
  id: string
  product_name: string | null
  processed_image_url: string | null
  original_image_url: string | null
  original_url: string | null
  affiliate_url: string | null
  merchant: string | null
  price: number | null
  category: string | null
  status: 'pending' | 'processing' | 'ready' | 'failed'
}

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Resolve an image URL for display AND canvas loading.
 *
 * - External URLs (https://media.sett.style/...) → used directly
 *   (R2 CDN has CORS configured in production)
 * - Local API URLs (http://localhost:8000/uploads/...) → proxied through
 *   Next.js /api/proxy-image so the browser sees same-origin
 * - Relative paths (/uploads/...) → made absolute, then proxied
 *
 * Why proxy? Fabric.js FabricImage.fromURL with crossOrigin:'anonymous'
 * triggers a CORS check. If it fails, the image doesn't load AND the
 * canvas becomes tainted (toDataURL breaks on publish). Proxying
 * through Next.js eliminates both problems entirely.
 */
function resolveImageUrl(url: string | null): string {
  if (!url) return ''
  // External production URLs — use directly (CDN has CORS headers)
  if (url.startsWith('https://') && !url.includes('localhost')) return url
  // Local dev API URLs — proxy through Next.js
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/proxy-image?src=${encodeURIComponent(url)}`
  }
  // Relative paths — make absolute, then proxy
  if (url.startsWith('/')) {
    return `/api/proxy-image?src=${encodeURIComponent(`${apiBase}${url}`)}`
  }
  return url
}

export function useItemLibrary() {
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useQuery<LibraryItem[]>({
    queryKey: ['item-library'],
    queryFn: async () => {
      if (!token) return []
      const res = await fetch(`${apiBase}/api/items`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!token && isAuthenticated,
    staleTime: 30_000,
    retry: 1,
    refetchInterval: (query) => {
      const items = query.state.data
      if (!Array.isArray(items)) return false
      return items.some((i: LibraryItem) => i.status === 'processing') ? 5_000 : false
    },
    select: (items) =>
      items.map((item) => ({
        ...item,
        processed_image_url: resolveImageUrl(item.processed_image_url),
        original_image_url: resolveImageUrl(item.original_image_url),
      })),
  })

  return {
    items: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['item-library'] }),
  }
}