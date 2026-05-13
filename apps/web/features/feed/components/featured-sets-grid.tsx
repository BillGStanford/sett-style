import Link from 'next/link'

interface FeaturedSet {
  id: string
  title: string
  thumbnail_url: string | null
  creator: { username: string | null }
  like_count: number
}

async function getFeaturedSets(): Promise<FeaturedSet[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sets/featured`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function FeaturedSetsGrid() {
  const sets = await getFeaturedSets()

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-near-black mb-2">From the community</h2>
            <p className="text-gray-primary">Sets built by real creators. Every item is shoppable.</p>
          </div>
          <Link href="/feed"
            className="hidden sm:block text-sm font-medium text-near-black border-b border-near-black pb-0.5 hover:text-gray-primary hover:border-gray-primary transition-colors">
            See all →
          </Link>
        </div>

        {sets.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-border rounded-[12px]">
            <p className="text-sm font-semibold text-near-black mb-2">No sets published yet.</p>
            <p className="text-xs text-gray-tertiary mb-6">Be the first creator to publish a look.</p>
            <Link href="/canvas" className="btn-primary text-sm px-6 py-3 inline-block">Start Creating</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sets.map((set) => (
              <article key={set.id} className="set-card group">
                <Link href={`/sets/${set.id}`} className="block">
                  <div className="aspect-square bg-gray-bg relative overflow-hidden">
                    {set.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={set.thumbnail_url} alt={set.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-gray-tertiary">{set.title}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-near-black/0 group-hover:bg-near-black/50 transition-all duration-200 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                      <span className="bg-white text-near-black text-sm font-semibold rounded-[12px] px-6 py-2.5">
                        Steal This Look
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-near-black mb-1">{set.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-tertiary">@{set.creator?.username ?? 'creator'}</span>
                      <span className="text-xs text-gray-tertiary">{set.like_count?.toLocaleString() ?? 0} likes</span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
