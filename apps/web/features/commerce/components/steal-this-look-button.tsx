'use client'

interface Item {
  id: string
  productName: string
  merchant: string
  price: number
  affiliateUrl: string
  thumbnailUrl: string
}

/**
 * StealThisLookButton — primary commerce CTA on the set page.
 *
 * This is the most important button on the platform.
 * It opens a full-screen mobile-optimized shoppable view of all items.
 *
 * Click tracking:
 * - Clicks are tracked server-side via a redirect through /api/clicks/[itemId]
 * - This ensures tracking works even with ad blockers
 * - Data: click_id, item_id, set_id, creator_id, timestamp, referrer
 */
export function StealThisLookButton({ setId, items }: { setId: string; items: Item[] }) {
  return (
    <button
      className="w-full bg-near-black text-white font-semibold rounded-[12px] py-4 text-base hover:bg-black transition-colors"
      onClick={() => {
        // TODO: open full-screen shoppable modal
        // For now: scroll to item list
        document.getElementById('item-shop-list')?.scrollIntoView({ behavior: 'smooth' })
      }}
    >
      Steal This Look
    </button>
  )
}

/**
 * ItemShopList — list of shoppable items in a set.
 *
 * Each item links through /api/click/[itemId]?set=[setId] for click tracking,
 * then redirects to the affiliate URL.
 *
 * This redirect approach (vs client-side tracking) is more reliable:
 * - Works with ad blockers
 * - Server has full context (user-agent, referrer)
 * - Can validate affiliate link freshness before redirect
 */
export function ItemShopList({ items, setId }: { items: Item[]; setId: string }) {
  return (
    <div id="item-shop-list" className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-4 p-3 rounded-[8px] border border-gray-border hover:border-near-black/30 transition-colors group">
          {/* Thumbnail */}
          <div className="w-12 h-12 rounded-[6px] bg-gray-bg flex-shrink-0 overflow-hidden">
            {item.thumbnailUrl && (
              <img src={item.thumbnailUrl} alt={item.productName} className="w-full h-full object-contain" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-near-black truncate">{item.productName}</p>
            <p className="text-xs text-gray-tertiary">{item.merchant}</p>
          </div>

          {/* Price + Shop */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm font-semibold text-near-black">${item.price}</span>
            <a
              href={`/api/click/${item.id}?set=${setId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold border border-gray-border rounded-full px-4 py-1.5 hover:bg-near-black hover:text-white hover:border-near-black transition-all"
            >
              Shop
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
