"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { api } from "@/lib/api/client"

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
  is_liked?: boolean
}

interface ProfileSetsTabsProps {
  publishedSets: SetCard[]
  privateAndDraftSets: SetCard[]
  isOwnProfile: boolean
  username: string
}

type Tab = "published" | "drafts" | "private"

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all
        ${active
          ? "bg-near-black text-white shadow-sm"
          : "bg-gray-bg text-gray-secondary hover:text-near-black hover:bg-gray-border"
        }
      `}
    >
      {label}
      <span
        className={`
          inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold
          ${active ? "bg-white/20 text-white" : "bg-gray-border text-gray-tertiary"}
        `}
      >
        {count}
      </span>
    </button>
  )
}

function ActionButton({
  icon,
  label,
  loading,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
      disabled={loading}
      title={label}
      className="w-7 h-7 flex items-center justify-center rounded-md bg-white/90 backdrop-blur border border-gray-border text-gray-secondary hover:text-near-black hover:border-gray-tertiary transition-all disabled:opacity-40"
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
    </button>
  )
}

function SetCardGrid({
  sets,
  isOwnProfile,
  actionSlot,
  emptyMessage,
}: {
  sets: SetCard[]
  isOwnProfile: boolean
  actionSlot?: (set: SetCard) => React.ReactNode
  emptyMessage: string
}) {
  if (sets.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-gray-border rounded-[12px]">
        <p className="text-xs text-gray-tertiary">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {sets.map((set) => (
        <Link
          key={set.id}
          href={isOwnProfile ? `/canvas?set=${set.id}` : `/sets/${set.id}`}
          className="set-card group block"
        >
          <div className="aspect-square bg-gray-bg overflow-hidden border border-gray-border relative">
            {set.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={set.thumbnail_url}
                alt={set.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs text-gray-tertiary truncate px-4 text-center">{set.title}</span>
              </div>
            )}

            {/* Hover action buttons — own profile only */}
            {isOwnProfile && actionSlot && (
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {actionSlot(set)}
              </div>
            )}
          </div>

          <div className="p-3">
            <p className="text-xs font-semibold text-near-black truncate">{set.title}</p>
            <p className="text-xs text-gray-tertiary mt-0.5">
              {set.like_count?.toLocaleString() ?? 0} likes
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function ProfileSetsTabs({
  publishedSets,
  privateAndDraftSets,
  isOwnProfile,
  username,
}: ProfileSetsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("published")
  const [sets, setSets] = useState<SetCard[]>({
    published: publishedSets,
    drafts: privateAndDraftSets.filter((s) => !s.is_published),
    private: privateAndDraftSets.filter((s) => s.is_published && s.privacy === "private"),
  })
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const counts = {
    published: sets.published.length,
    drafts: sets.drafts.length,
    private: sets.private.length,
  }

  const moveSet = useCallback((setId: string, from: Tab, to: Tab, updates: Partial<SetCard>) => {
    setSets((prev) => {
      const fromList = prev[from].filter((s) => s.id !== setId)
      const setToMove = prev[from].find((s) => s.id === setId)
      if (!setToMove) return prev
      return {
        ...prev,
        [from]: fromList,
        [to]: [...prev[to], { ...setToMove, ...updates }],
      }
    })
  }, [])

  const revertSet = useCallback((setId: string, from: Tab, to: Tab, original: SetCard) => {
    setSets((prev) => {
      const fromList = prev[from].filter((s) => s.id !== setId)
      return {
        ...prev,
        [from]: fromList,
        [to]: [...prev[to], original],
      }
    })
  }, [])

  const handlePublish = async (set: SetCard) => {
    const original = { ...set }
    setTogglingId(set.id)
    moveSet(set.id, "drafts", "published", { is_published: true, privacy: "public" })
    try {
      await api.patch(`/api/sets/${set.id}`, { is_published: true, privacy: "public" })
    } catch {
      revertSet(set.id, "published", "drafts", original)
    } finally {
      setTogglingId(null)
    }
  }

  const handleMakePrivate = async (set: SetCard, from: Tab) => {
    const original = { ...set }
    setTogglingId(set.id)
    const targetPrivacy = "private" as const
    const updates: Partial<SetCard> = { privacy: targetPrivacy, is_published: true }
    if (from === "published") {
      moveSet(set.id, from, "private", updates)
    } else {
      // drafts → private (publish but keep private)
      moveSet(set.id, "drafts", "private", updates)
    }
    try {
      await api.patch(`/api/sets/${set.id}`, { is_published: true, privacy: targetPrivacy })
    } catch {
      revertSet(set.id, "private", from, original)
    } finally {
      setTogglingId(null)
    }
  }

  const handleMakePublic = async (set: SetCard) => {
    const original = { ...set }
    setTogglingId(set.id)
    moveSet(set.id, "private", "published", { privacy: "public" })
    try {
      await api.patch(`/api/sets/${set.id}/privacy`, { privacy: "public" })
    } catch {
      revertSet(set.id, "published", "private", original)
    } finally {
      setTogglingId(null)
    }
  }

  const loading = (id: string) => togglingId === id

  // Eye icon (public)
  const eyeIcon = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  // Eye-off icon (private)
  const eyeOffIcon = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )

  // Globe icon (publish)
  const globeIcon = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  // Edit icon
  const editIcon = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )

  return (
    <div>
      {/* ── Tab bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <TabButton
          label="Published"
          count={counts.published}
          active={activeTab === "published"}
          onClick={() => setActiveTab("published")}
        />
        {isOwnProfile && (
          <>
            <TabButton
              label="Not Published"
              count={counts.drafts}
              active={activeTab === "drafts"}
              onClick={() => setActiveTab("drafts")}
            />
            <TabButton
              label="Private"
              count={counts.private}
              active={activeTab === "private"}
              onClick={() => setActiveTab("private")}
            />
          </>
        )}
      </div>

      {/* ── Published ────────────────────────────────────────── */}
      {activeTab === "published" && (
        <SetCardGrid
          sets={sets.published}
          isOwnProfile={isOwnProfile}
          emptyMessage={
            isOwnProfile
              ? "You haven't published any sets yet."
              : `@${username} hasn't published any sets yet.`
          }
          actionSlot={(set) => (
            <>
              <ActionButton
                icon={editIcon}
                label="Edit"
                loading={loading(set.id)}
                onClick={() => {}}
              />
              <ActionButton
                icon={eyeOffIcon}
                label="Make Private"
                loading={loading(set.id)}
                onClick={() => handleMakePrivate(set, "published")}
              />
            </>
          )}
        />
      )}

      {/* ── Not Published (Drafts) ───────────────────────────── */}
      {activeTab === "drafts" && (
        <SetCardGrid
          sets={sets.drafts}
          isOwnProfile={isOwnProfile}
          emptyMessage="No drafts. Sets you create but don't publish will appear here."
          actionSlot={(set) => (
            <>
              <ActionButton
                icon={editIcon}
                label="Edit"
                loading={loading(set.id)}
                onClick={() => {}}
              />
              <ActionButton
                icon={globeIcon}
                label="Publish"
                loading={loading(set.id)}
                onClick={() => handlePublish(set)}
              />
              <ActionButton
                icon={eyeOffIcon}
                label="Save as Private"
                loading={loading(set.id)}
                onClick={() => handleMakePrivate(set, "drafts")}
              />
            </>
          )}
        />
      )}

      {/* ── Private ──────────────────────────────────────────── */}
      {activeTab === "private" && (
        <SetCardGrid
          sets={sets.private}
          isOwnProfile={isOwnProfile}
          emptyMessage="No private sets. Published sets you've hidden from the feed appear here."
          actionSlot={(set) => (
            <>
              <ActionButton
                icon={editIcon}
                label="Edit"
                loading={loading(set.id)}
                onClick={() => {}}
              />
              <ActionButton
                icon={eyeIcon}
                label="Make Public"
                loading={loading(set.id)}
                onClick={() => handleMakePublic(set)}
              />
            </>
          )}
        />
      )}
    </div>
  )
}