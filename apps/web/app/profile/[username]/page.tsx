import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { ProfileHeader } from '@/features/profile/components/profile-header'
import { ProfileTabsSection } from '@/features/profile/components/profile-tabs-section'

interface ProfilePageProps {
  params: { username: string }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getServerToken(): Promise<string | null> {
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

async function getUserProfile(username: string, token: string | null) {
  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_URL}/api/users/@${username}`, { headers, cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function getCurrentUser(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function getUserPublishedSets(userId: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/sets/feed?user_id=${userId}&limit=50`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getPrivateSets(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/sets/private`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getDraftSets(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/sets/drafts`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getUnpublishedItems(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/items/unpublished`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const token = await getServerToken()
  const user = await getUserProfile(params.username, token)
  if (!user) return { title: 'Profile not found — SETT' }
  return {
    title: `@${user.username} — SETT`,
    description: user.bio ?? `Fashion sets by @${user.username} on SETT. Shop every look.`,
    openGraph: {
      title: `@${user.username} on SETT`,
      description: user.bio ?? `Browse and shop sets by @${user.username}`,
      images: user.avatar_url ? [{ url: user.avatar_url }] : [],
    },
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const token = await getServerToken()
  const user = await getUserProfile(params.username, token)
  if (!user) notFound()

  // Everyone sees published sets
  const publishedSets = await getUserPublishedSets(user.id)

  // Only fetch private data for the profile owner
  let isOwnProfile = false
  let privateSets: any[] = []
  let draftSets: any[] = []
  let unpublishedItems: any[] = []

  if (token) {
    const currentUser = await getCurrentUser(token)
    if (currentUser && currentUser.id === user.id) {
      isOwnProfile = true
      ;[privateSets, draftSets, unpublishedItems] = await Promise.all([
        getPrivateSets(token),
        getDraftSets(token),
        getUnpublishedItems(token),
      ])
    }
  }

  // ── Visitor view: simple grid, no tabs ──
  if (!isOwnProfile) {
    return (
      <>
        <SiteHeader />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <ProfileHeader user={user} />
          {publishedSets.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-border rounded-[12px]">
              <p className="text-sm font-semibold text-near-black mb-2">No published sets yet.</p>
              <p className="text-xs text-gray-tertiary">@{user.username} hasn&apos;t published any looks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {publishedSets.map((set: any) => (
                <Link key={set.id} href={`/sets/${set.id}`} className="set-card group block">
                  <div className="aspect-square bg-gray-bg overflow-hidden">
                    {set.thumbnail_url ? (
                      <img src={set.thumbnail_url} alt={set.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-tertiary truncate px-2">{set.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-near-black truncate">{set.title}</p>
                    <p className="text-xs text-gray-tertiary mt-0.5">{set.like_count?.toLocaleString() ?? 0} likes</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </>
    )
  }

  // ── Own profile: tabbed view ──
  return (
    <>
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProfileHeader user={user} />
        <ProfileTabsSection
          publishedSets={publishedSets}
          privateSets={privateSets}
          draftSets={draftSets}
          unpublishedItems={unpublishedItems}
        />
      </main>
    </>
  )
}