'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'

interface Item {
  id: string
  product_name: string | null
  merchant: string | null
  price: number | null
  affiliate_url: string | null
  processed_image_url: string | null
}

interface Props {
  setId: string
  items: Item[]
}

/**
 * StealThisLookSection — the primary commerce component on the set detail page.
 * Contains the hero CTA button + the itemized shop list beneath it.
 *
 * Click tracking: every "Shop" button routes through /api/commerce/click/{itemId}?set={setId}
 * which records the click server-side before redirecting to the affiliate URL.
 * This is more reliable than client-side tracking (works with ad blockers).
 */
export function StealThisLookSection({ setId, items }: Props) {
  const [expanded, setExpanded] = useState(false)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  if (!items || items.length === 0) {
    return (
      <div className="py-4 text-sm text-gray-tertiary">No items in this set yet.</div>
    )
  }

  const visibleItems = expanded ? items : items.slice(0, 4)

  return (
    <div>
      {/* Hero CTA */}
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-near-black text-white font-semibold rounded-[12px] py-4 text-base hover:bg-black transition-colors mb-5"
      >
        Steal This Look
      </button>

      {/* Item list */}
      <h2 className="text-sm font-semibold text-near-black mb-3">Items in this Set</h2>
      <div className="space-y-2.5">
        {visibleItems.map((item) => (
          <div key={item.id}
            className="flex items-center gap-4 p-3 rounded-[10px] border border-gray-border hover:border-near-black/30 transition-colors group"
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-[6px] bg-gray-bg flex-shrink-0 overflow-hidden border border-gray-border">
              {item.processed_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.processed_image_url} alt={item.product_name ?? ''} className="w-full h-full object-contain" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-near-black truncate">{item.product_name ?? 'Item'}</p>
              <p className="text-xs text-gray-tertiary">{item.merchant ?? ''}</p>
            </div>

            {/* Price + Shop */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {item.price != null && (
                <span className="text-sm font-semibold text-near-black">${item.price.toFixed(2)}</span>
              )}
              <a
                href={`${apiBase}/api/commerce/click/${item.id}?set=${setId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold border border-gray-border rounded-full px-4 py-1.5 hover:bg-near-black hover:text-white hover:border-near-black transition-all whitespace-nowrap"
              >
                Shop
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Show more */}
      {!expanded && items.length > 4 && (
        <button onClick={() => setExpanded(true)}
          className="mt-3 w-full text-xs text-gray-tertiary hover:text-near-black transition-colors py-2 border border-gray-border rounded-[8px]">
          Show all {items.length} items
        </button>
      )}
    </div>
  )
}
