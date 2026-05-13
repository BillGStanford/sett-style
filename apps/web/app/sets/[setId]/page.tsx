import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { SiteHeader } from '@/components/layout/site-header'
import { StealThisLookSection } from '@/features/commerce/components/steal-this-look-section'
import { LinkedItemsSection } from '@/features/sets/components/linked-items-section'
import { RelatedSets } from '@/features/sets/components/related-sets'
import { EditSetButton } from '@/features/sets/components/edit-set-button'
import { SetEditsSection } from '@/features/sets/components/set-edits-section'
import { LikeButton } from '@/features/sets/components/like-button'
import Link from 'next/link'

interface SetPageProps {
  params: { setId: string }
}

function TierBadge({ tier }: { tier?: string }) {
  if (tier === 'founder') {
    return (
      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
        </svg>
        Founder
      </span>
    )
  }
  if (tier === 'early_user') {
    return (
      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
        Early
      </span>
    )
  }
  return null
}

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

/**
 * Read the session ID cookie for view deduplication.
 * Cookie is set by middleware on first visit - we only read it here.
 * If cookie doesn't exist yet (first-ever request before middleware response),
 * generate a temporary ID - it won't persist but view still won't double-count
 * because middleware sets the real cookie for all subsequent requests.
 */
async function getSessionId(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get('sett_sid')?.value
  return existing || crypto.randomUUID()
}

async function getSet(setId: string, token: string | null, sessionId: string) {
  try {
    const headers: Record<string, string> = {
      'X-Session-ID': sessionId,
    }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sets/${setId}`,
      { headers, cache: 'no-store' }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function getSetItems(setId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sets/${setId}/items`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getSetEdits(setId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sets/${setId}/edits`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function extractLinkedItems(canvasJson: any): Array<{
  linked_url: string
  linked_title: string
  linked_description: string
  linked_image_url: string | null
}> {
  if (!canvasJson?.objects || !Array.isArray(canvasJson.objects)) return []
  return canvasJson.objects
    .filter((obj: any) => !!obj.linked_url)
    .map((obj: any) => ({
      linked_url: obj.linked_url,
      linked_title: obj.linked_title || obj.product_name || 'Item',
      linked_description: obj.linked_description || '',
      linked_image_url: obj.linked_image_url || obj.src || null,
    }))
}

export async function generateMetadata({ params }: SetPageProps): Promise<Metadata> {
  const token = await getServerToken()
  const sessionId = await getSessionId()
  const set = await getSet(params.setId, token, sessionId)
  if (!set) return { title: 'Set not found — SETT' }
  return {
    title: `${set.title} by @${set.creator?.username ?? 'creator'} — SETT`,
    description: `Shop this ${(set.aesthetic_tags || []).join(', ')} look.`,
    openGraph: {
      title: set.title,
      description: `Styled by @${set.creator?.username ?? 'creator'} on SETT`,
      images: set.thumbnail_url ? [{ url: set.thumbnail_url }] : [],
    },
  }
}

export default async function SetPage({ params }: SetPageProps) {
  const token = await getServerToken()
  const sessionId = await getSessionId()
  const set = await getSet(params.setId, token, sessionId)
  if (!set) notFound()

  const [items, edits] = await Promise.all([
    set.items ?? getSetItems(params.setId),
    getSetEdits(params.setId),
  ])

  const linkedItems = extractLinkedItems(set.canvas_json)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: set.title,
    itemListElement: items.map((item: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: item.product_name,
        offers: { '@type': 'Offer', price: item.price, priceCurrency: 'USD', url: item.affiliate_url },
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="sett-card overflow-hidden aspect-square bg-gray-bg">
            {set.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={set.thumbnail_url} alt={set.title} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-gray-tertiary">No preview</p>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            {/* View Original SETT banner */}
            {set.parent_set_id && (
              <div className="mb-5 flex items-center gap-3 bg-gray-bg rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v18h-6zM9 3H3v18h6z"/>
                </svg>
                <span className="text-xs text-gray-primary">
                  Edited from original.{' '}
                  <Link href={`/sets/${set.parent_set_id}`} className="font-semibold text-near-black underline underline-offset-2 hover:text-gray-primary">
                    View Original SETT →
                  </Link>
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-gray-bg overflow-hidden flex-shrink-0">
                {set.creator?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={set.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Link href={`/profile/${set.creator?.username}`} className="text-sm font-semibold text-near-black hover:underline">
                  @{set.creator?.username ?? 'creator'}
                </Link>
                <TierBadge tier={set.creator?.user_tier} />
              </div>
            </div>

            <h1 className="text-3xl font-black text-near-black mb-3 leading-tight">{set.title}</h1>

            <div className="flex items-center gap-5 text-xs text-gray-tertiary mb-4">
              <LikeButton 
                setId={params.setId} 
                initialLiked={set.is_liked} 
                initialCount={set.like_count}
                size="md"
              />
              <span>{set.view_count?.toLocaleString() ?? 0} views</span>
            </div>

            {(set.aesthetic_tags ?? []).length > 0 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {set.aesthetic_tags.map((tag: string) => (
                  <Link key={tag} href={`/feed?aesthetic=${encodeURIComponent(tag)}`}
                    className="text-xs bg-gray-bg text-gray-primary rounded-full px-3 py-1 hover:bg-gray-border transition-colors">
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <StealThisLookSection setId={params.setId} items={items} />

            <div className="mt-6 flex items-center gap-4">
              <EditSetButton setUserId={set.user_id} setId={params.setId} />
              <Link href={`/canvas?set=${params.setId}`}
                className="text-xs text-gray-tertiary underline underline-offset-2 hover:text-near-black transition-colors">
                {set.is_owner ? 'Edit this set →' : 'Open in canvas →'}
              </Link>
            </div>
          </div>
        </div>

        {linkedItems.length > 0 && (
          <div className="mt-14">
            <LinkedItemsSection items={linkedItems} />
          </div>
        )}

        <SetEditsSection edits={edits} />

        <div className="mt-16">
          <RelatedSets currentSetId={params.setId} tags={set.aesthetic_tags ?? []} />
        </div>
      </main>
    </>
  )
}