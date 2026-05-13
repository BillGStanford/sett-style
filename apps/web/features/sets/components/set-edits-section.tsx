import Link from 'next/link'

interface EditSet {
  id: string
  title: string
  thumbnail_url: string | null
  creator: { id: string; username: string | null; avatar_url: string | null }
  like_count: number
  created_at: string
}

interface SetEditsSectionProps {
  edits: EditSet[]
}

export function SetEditsSection({ edits }: SetEditsSectionProps) {
  if (edits.length === 0) return null

  return (
    <div className="mt-14">
      <h2 className="text-lg font-black text-near-black mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
        This Original SETT has been Edited By
      </h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {edits.map((edit) => (
          <article key={edit.id} className="flex-shrink-0 w-[180px] group">
            <Link href={`/sets/${edit.id}`} className="block">
              <div className="aspect-square bg-gray-bg relative overflow-hidden rounded-[12px] border border-gray-border/50">
                {edit.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={edit.thumbnail_url}
                    alt={edit.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <span className="text-xs text-gray-tertiary text-center truncate">{edit.title}</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="pt-2 px-1">
              <p className="text-xs font-semibold text-near-black truncate">{edit.title}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[11px] text-gray-tertiary truncate mr-2">@{edit.creator?.username ?? 'creator'}</span>
                <span className="text-[11px] text-gray-tertiary">{edit.like_count} ♡</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}