"use client"

import { useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api/client"

interface PrivateSet {
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

interface UnpublishedItem {
  id: string
  product_name: string | null
  processed_image_url: string | null
  price: number | null
  currency: string
  brand: string | null
  merchant: string | null
  status: "pending" | "processing" | "ready" | "failed"
  original_url: string | null
  created_at: string
}

interface PrivateContentSectionProps {
  initialPrivateSets: PrivateSet[]
  initialUnpublishedItems: UnpublishedItem[]
}

function StatusBadge({ privacy, isPublished }: { privacy: string; isPublished: boolean }) {
  if (!isPublished) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Draft
      </span>
    )
  }
  if (privacy === "private") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        Private
      </span>
    )
  }
  return null
}

function ItemStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500 border-gray-200",
    processing: "bg-blue-50 text-blue-600 border-blue-200",
    ready: "bg-green-50 text-green-700 border-green-200",
    failed: "bg-red-50 text-red-600 border-red-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}

export function PrivateContentSection({
  initialPrivateSets,
  initialUnpublishedItems,
}: PrivateContentSectionProps) {
  const [privateSets, setPrivateSets] = useState<PrivateSet[]>(initialPrivateSets)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showPrivateSets, setShowPrivateSets] = useState(true)
  const [showUnpublishedItems, setShowUnpublishedItems] = useState(true)

  const handleTogglePrivacy = async (setId: string, currentPrivacy: string) => {
    const newPrivacy = currentPrivacy === "private" ? "public" : "private"
    setTogglingId(setId)

    // Optimistic update
    setPrivateSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, privacy: newPrivacy } : s))
    )

    try {
      await api.patch(`/api/sets/${setId}/privacy`, { privacy: newPrivacy })

      // If making public and it was private+published, remove from list
      if (newPrivacy === "public") {
        setPrivateSets((prev) => {
          const set = prev.find((s) => s.id === setId)
          if (set && set.is_published) {
            return prev.filter((s) => s.id !== setId)
          }
          return prev
        })
      }
    } catch {
      // Revert on error
      setPrivateSets((prev) =>
        prev.map((s) => (s.id === setId ? { ...s, privacy: currentPrivacy } : s))
      )
    } finally {
      setTogglingId(null)
    }
  }

  const hasPrivateSets = privateSets.length > 0
  const hasUnpublishedItems = initialUnpublishedItems.length > 0

  if (!hasPrivateSets && !hasUnpublishedItems) return null

  return (
    <div className="mt-12 space-y-8">
      {/* ── Private / Draft Sets ─────────────────────────────── */}
      {hasPrivateSets && (
        <section>
          <button
            onClick={() => setShowPrivateSets(!showPrivateSets)}
            className="flex items-center gap-2 mb-4 group w-full text-left"
          >
            <svg
              className={`w-4 h-4 text-gray-tertiary transition-transform ${showPrivateSets ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h2 className="text-sm font-bold text-near-black uppercase tracking-wider">
              Private & Draft Sets
            </h2>
            <span className="text-xs text-gray-tertiary bg-gray-bg px-2 py-0.5 rounded-full">
              {privateSets.length}
            </span>
          </button>

          {showPrivateSets && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {privateSets.map((set) => (
                <div key={set.id} className="group relative">
                  {/* Thumbnail */}
                  <Link
                    href={`/canvas?set=${set.id}`}
                    className="set-card block aspect-square bg-gray-bg overflow-hidden border border-gray-border"
                  >
                    {set.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={set.thumbnail_url}
                        alt={set.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-tertiary truncate px-2">{set.title}</span>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-near-black truncate flex-1">{set.title}</p>
                      <StatusBadge privacy={set.privacy} isPublished={set.is_published} />
                    </div>
                    <p className="text-xs text-gray-tertiary mt-0.5">
                      {set.like_count?.toLocaleString() ?? 0} likes
                    </p>
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/canvas?set=${set.id}`}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white/90 border border-gray-border text-gray-secondary hover:text-near-black transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>

                    <button
                      onClick={() => handleTogglePrivacy(set.id, set.privacy)}
                      disabled={togglingId === set.id}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white/90 border border-gray-border text-gray-secondary hover:text-near-black transition-colors disabled:opacity-50"
                      title={set.privacy === "private" ? "Make public" : "Make private"}
                    >
                      {togglingId === set.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : set.privacy === "private" ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Unpublished Items ────────────────────────────────── */}
      {hasUnpublishedItems && (
        <section>
          <button
            onClick={() => setShowUnpublishedItems(!showUnpublishedItems)}
            className="flex items-center gap-2 mb-4 group w-full text-left"
          >
            <svg
              className={`w-4 h-4 text-gray-tertiary transition-transform ${showUnpublishedItems ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h2 className="text-sm font-bold text-near-black uppercase tracking-wider">
              Unpublished Items
            </h2>
            <span className="text-xs text-gray-tertiary bg-gray-bg px-2 py-0.5 rounded-full">
              {initialUnpublishedItems.length}
            </span>
          </button>

          {showUnpublishedItems && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {initialUnpublishedItems.map((item) => (
                <div key={item.id} className="group">
                  <div className="aspect-square bg-gray-bg border border-gray-border overflow-hidden flex items-center justify-center">
                    {item.processed_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.processed_image_url}
                        alt={item.product_name || "Item"}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-gray-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
                      </svg>
                    )}
                  </div>
                  <div className="mt-1.5 px-0.5">
                    <p className="text-[10px] font-semibold text-near-black truncate">
                      {item.product_name || item.brand || "Untitled"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {item.price != null && (
                        <span className="text-[10px] text-gray-tertiary">
                          ${item.price.toFixed(0)}
                        </span>
                      )}
                      <ItemStatusBadge status={item.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}