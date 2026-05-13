import Link from 'next/link'

interface RelatedSet {
  id: string
  title: string
  thumbnail_url: string | null
  creator: { username: string | null }
  like_count: number
}

async function fetchRelatedSets(setId: string, tags: string[]): Promise<RelatedSet[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sets/related/${setId}`,
      { next: { revalidate: 120 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function RelatedSets({ currentSetId, tags }: { currentSetId: string; tags: string[] }) {
  const sets = await fetchRelatedSets(currentSetId, tags)
  if (sets.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-black text-near-black mb-6">Related Outfits</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {sets.map((set) => (
          <Link key={set.id} href={`/sets/${set.id}`} className="set-card group block">
            <div className="aspect-square bg-gray-bg overflow-hidden">
              {set.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={set.thumbnail_url} alt={set.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-gray-tertiary">No preview</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-near-black truncate">{set.title}</p>
              <p className="text-xs text-gray-tertiary mt-0.5">@{set.creator?.username ?? 'creator'}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
