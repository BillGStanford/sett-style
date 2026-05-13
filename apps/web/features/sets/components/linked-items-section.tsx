interface LinkedItem {
  linked_url: string
  linked_title: string
  linked_description: string
  linked_image_url: string | null
}

interface LinkedItemsSectionProps {
  items: LinkedItem[]
}

export function LinkedItemsSection({ items }: LinkedItemsSectionProps) {
  if (!items || items.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-black text-near-black">Items in this SETT</h2>
        <span className="text-[11px] text-gray-tertiary bg-gray-bg px-2.5 py-0.5 rounded-full font-medium">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <a
            key={`${item.linked_url}-${index}`}
            href={item.linked_url}
            target="_blank"
            rel="noopener noreferrer"
            className="sett-card group block"
          >
            {/* Image — ★ added relative here */}
            <div className="aspect-square bg-gray-bg overflow-hidden relative">
              {item.linked_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.linked_image_url}
                  alt={item.linked_title}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-border">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}

              {/* Hover overlay — now scoped to this div */}
              <div className="absolute inset-0 bg-near-black/0 group-hover:bg-near-black/30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="bg-white text-near-black text-xs font-semibold rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  View
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-sm font-semibold text-near-black leading-snug line-clamp-2 mb-1">
                {item.linked_title}
              </p>
              {item.linked_description && (
                <p className="text-[11px] text-gray-tertiary leading-relaxed line-clamp-2 mb-2">
                  {item.linked_description}
                </p>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-near-black">
                Shop this
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}