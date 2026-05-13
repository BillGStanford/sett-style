"use client"

import { useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api/client"

// ── Types ────────────────────────────────────────────────────────────────────

interface SetCard {
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
}

interface ProfileTabsSectionProps {
  publishedSets: SetCard[]
  privateSets: SetCard[]
  draftSets: SetCard[]
  unpublishedItems: UnpublishedItem[]
}

type Tab = "published" | "private" | "drafts"

// ── Set card (reused across all tabs) ────────────────────────────────────────

function SetGrid({
  sets,
  showPrivacyToggle,
  onTogglePrivacy,
  togglingId,
}: {
  sets: SetCard[]
  showPrivacyToggle?: boolean
  onTogglePrivacy?: (setId: string, currentPrivacy: string) => void
  togglingId?: string | null
}) {
  if (sets.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-gray-border rounded-[12px]">
        <p className="text-sm text-gray-tertiary">Nothing here yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {sets.map((set) => (
        <div key={set.id} className="group relative">
          <Link
            href={set.is_published && set.privacy === "public" ? `/sets/${set.id}` : `/canvas?set=${set.id}`}
            className="set-card block aspect-square bg-gray-bg overflow-hidden border border-gray-border"
          >
            {set.thumbnail_url ? (
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

          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-near-black truncate flex-1">{set.title}</p>
              {showPrivacyToggle && (
                <button
                  onClick={() => onTogglePrivacy?.(set.id, set.privacy)}
                  disabled={togglingId === set.id}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md border border-gray-border bg-white text-gray-secondary hover:text-near-black hover:border-gray-secondary transition-colors disabled:opacity-40"
                  title={set.privacy === "private" ? "Make public" : "Make private"}
                >
                  {togglingId === set.id ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : set.privacy === "private" ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-tertiary mt-0.5">
              {set.like_count?.toLocaleString() ?? 0} likes
            </p>
          </div>

          {/* Edit button overlay on hover for non-published sets */}
          {!set.is_published && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link
                href={`/canvas?set=${set.id}`}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white/90 border border-gray-border text-gray-secondary hover:text-near-black transition-colors"
                title="Edit in canvas"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Unpublished items grid (drafts tab only) ─────────────────────────────────

function UnpublishedItemsGrid({ items }: { items: UnpublishedItem[] }) {
  if (items.length === 0) return null

  const statusStyle: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
    processing: "bg-blue-50 text-blue-600",
    ready: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-600",
  }

  return (
    <div className="mt-10">
      <h3 className="text-xs font-bold text-near-black uppercase tracking-wider mb-4">
        Unpublished Items
        <span className="ml-2 text-[10px] font-semibold text-gray-tertiary bg-gray-bg px-2 py-0.5 rounded-full normal-case tracking-normal">
          {items.length}
        </span>
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {items.map((item) => (
          <div key={item.id} className="group">
            <div className="aspect-square bg-gray-bg border border-gray-border overflow-hidden flex items-center justify-center">
              {item.processed_image_url ? (
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
              <div className="flex items-center gap-1.5 mt-0.5">
                {item.price != null && (
                  <span className="text-[10px] text-gray-tertiary">
                    ${item.price.toFixed(0)}
                  </span>
                )}
                <span className={`text-[9px] font-semibold px-1.5 py-px rounded-full ${statusStyle[item.status] || statusStyle.pending}`}>
                  {item.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main tabbed component ────────────────────────────────────────────────────

export function ProfileTabsSection({
  publishedSets,
  privateSets,
  draftSets,
  unpublishedItems,
}: ProfileTabsSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("published")
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [localPrivate, setLocalPrivate] = useState(privateSets)
  const [localDrafts, setLocalDrafts] = useState(draftSets)
  const [localPublished, setLocalPublished] = useState(publishedSets)

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "published", label: "Published", count: localPublished.length },
    { key: "private", label: "Private", count: localPrivate.length },
    { key: "drafts", label: "Drafts", count: localDrafts.length },
  ]

  const handleTogglePrivacy = async (setId: string, currentPrivacy: string) => {
    const newPrivacy = currentPrivacy === "private" ? "public" : "private"
    setTogglingId(setId)

    if (newPrivacy === "public") {
      // Moving from Private → Published
      const set = localPrivate.find((s) => s.id === setId)
      if (!set) return
      const updated = { ...set, privacy: "public" }
      setLocalPrivate((prev) => prev.filter((s) => s.id !== setId))
      setLocalPublished((prev) => [updated, ...prev])

      try {
        await api.patch(`/api/sets/${setId}/privacy`, { privacy: newPrivacy })
      } catch {
        setLocalPublished((prev) => prev.filter((s) => s.id !== setId))
        setLocalPrivate((prev) => [set, ...prev])
      } finally {
        setTogglingId(null)
      }
    } else {
      // Moving from Published → Private
      const set = localPublished.find((s) => s.id === setId)
      if (!set) return
      const updated = { ...set, privacy: "private" }
      setLocalPublished((prev) => prev.filter((s) => s.id !== setId))
      setLocalPrivate((prev) => [updated, ...prev])

      try {
        await api.patch(`/api/sets/${setId}/privacy`, { privacy: newPrivacy })
      } catch {
        setLocalPrivate((prev) => prev.filter((s) => s.id !== setId))
        setLocalPublished((prev) => [set, ...prev])
      } finally {
        setTogglingId(null)
      }
    }
  }

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              relative px-4 py-2.5 text-xs font-semibold transition-colors
              ${activeTab === tab.key
                ? "text-near-black"
                : "text-gray-tertiary hover:text-gray-secondary"
              }
            `}
          >
            {tab.label}
            <span className={`
              ml-1.5 text-[10px] font-semibold px-1.5 py-px rounded-full
              ${activeTab === tab.key
                ? "bg-near-black text-white"
                : "bg-gray-bg text-gray-tertiary"
              }
            `}>
              {tab.count}
            </span>
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-near-black rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "published" && (
          <>
            <p className="text-xs text-gray-tertiary mb-4">
              Visible on your public profile. Toggle the eye icon to make private.
            </p>
            <SetGrid
              sets={localPublished}
              showPrivacyToggle
              onTogglePrivacy={handleTogglePrivacy}
              togglingId={togglingId}
            />
          </>
        )}

        {activeTab === "private" && (
          <>
            <p className="text-xs text-gray-tertiary mb-4">
              Published but hidden from your public profile. Toggle the eye icon to make public.
            </p>
            <SetGrid
              sets={localPrivate}
              showPrivacyToggle
              onTogglePrivacy={handleTogglePrivacy}
              togglingId={togglingId}
            />
          </>
        )}

        {activeTab === "drafts" && (
          <>
            <p className="text-xs text-gray-tertiary mb-4">
              Saved but not yet published. Click a draft to continue editing.
            </p>
            <SetGrid sets={localDrafts} />
            <UnpublishedItemsGrid items={unpublishedItems} />
          </>
        )}
      </div>
    </div>
  )
}