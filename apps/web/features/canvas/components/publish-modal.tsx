'use client'

import { useState } from 'react'
import { useCanvasStore } from '@/features/canvas/store/canvas-store'
import { useAuthStore } from '@/lib/store/auth-store'

const TAGS = [
  'Quiet Luxury','Y2K','Streetwear','Dark Academia','Cottagecore',
  'Coastal Cowgirl','Mob Wife','Minimalist','Vintage','Grunge',
  'Preppy','Boho','Business Casual','Athleisure','Festival',
]

// Custom properties to serialize — must match canvas-editor.tsx
const CANVAS_CUSTOM_PROPS = [
  'item_id', 'affiliate_url', 'merchant', 'price', 'product_name', 'name',
  'linked_url', 'linked_title', 'linked_description', 'linked_image_url',
]

interface Props {
  fabricCanvas: any
  setId: string | null
  exportArtboard: () => string | null
  exportWatermarkedArtboard: () => string | null
  onClose: () => void
  onPublished: (setId: string) => void
}

export function PublishModal({ fabricCanvas, setId, exportArtboard, exportWatermarkedArtboard, onClose, onPublished }: Props) {
  const { setTitle: getStoreTitle } = useCanvasStore()
  const { token } = useAuthStore()
  const [title, setLocalTitle] = useState(getStoreTitle || '')
  const [tags, setTags] = useState<string[]>([])
  const [privacy, setPrivacy] = useState<'public'|'private'>('public')
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState('')
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  function toggleTag(tag: string) {
    setTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])
  }

  function dataURLtoBlob(dataURL: string): Blob {
    const [header, data] = dataURL.split(',')
    const mime = header.match(/:(.*?);/)![1]
    const bytes = atob(data)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }

  async function handlePublish() {
    if (!title.trim()) { setError('Give your set a title.'); return }
    if (!fabricCanvas) { setError('Canvas not ready.'); return }
    if (!token) { setError('You must be signed in.'); return }

    setIsPublishing(true)
    setError('')

    try {
      let thumbnailUrl = ''
      try {
        const dataUrl = exportWatermarkedArtboard()
        if (dataUrl) {
          const blob = dataURLtoBlob(dataUrl)
          const presignRes = await fetch(`${apiBase}/api/canvas/thumbnail-upload-url`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (presignRes.ok) {
            const { upload_url, public_url } = await presignRes.json()
            if (upload_url && public_url) {
              const uploadRes = await fetch(upload_url, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': 'image/png' },
              })
              if (uploadRes.ok) thumbnailUrl = public_url
            }
          }
          if (!thumbnailUrl) {
            const formData = new FormData()
            formData.append('file', blob, 'thumbnail.png')
            if (setId) formData.append('set_id', setId)
            const localRes = await fetch(`${apiBase}/api/canvas/thumbnail`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            })
            if (localRes.ok) {
              const data = await localRes.json()
              thumbnailUrl = data.url
            }
          }
        }
      } catch { /* continue without thumbnail */ }

      // ★ SAME FIX: manual injection instead of relying on toJSON custom props
      const canvasJson = fabricCanvas.toJSON()
      const liveObjects = fabricCanvas.getObjects()
      ;(canvasJson.objects || []).forEach((serialized: any, i: number) => {
        const live = liveObjects[i]
        if (!live) return
        for (const prop of CANVAS_CUSTOM_PROPS) {
          const val = live[prop]
          if (val !== undefined && val !== null) {
            serialized[prop] = val
          }
        }
      })

      const url = setId ? `${apiBase}/api/sets/${setId}` : `${apiBase}/api/sets`
      const method = setId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          aesthetic_tags: tags,
          privacy,
          canvas_json: canvasJson,
          thumbnail_url: thumbnailUrl || null,
          is_published: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Server error ${res.status}`)
      }

      const data = await res.json()
      onPublished(data.id)
    } catch (err: any) {
      setError(err.message || 'Publish failed. Try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-black text-near-black mb-6">Publish your set</h2>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-near-black block mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input type="text" value={title} onChange={e => setLocalTitle(e.target.value)}
              placeholder="e.g. Quiet Luxury Fall Work Outfit" maxLength={100}
              className="w-full border border-gray-border rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-near-black"
            />
            <p className="mt-1 text-xs text-gray-tertiary">Descriptive titles rank better on Google.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-near-black block mb-2">Aesthetics</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                    tags.includes(tag)
                      ? 'bg-near-black text-white border-near-black'
                      : 'border-gray-border text-gray-primary hover:border-near-black'
                  }`}>{tag}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-near-black block mb-2">Visibility</label>
            <div className="flex gap-4">
              {(['public','private'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="privacy" value={opt} checked={privacy === opt}
                    onChange={() => setPrivacy(opt)} className="accent-near-black" />
                  <span className="text-sm capitalize">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded p-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-gray-border rounded-[12px] py-3 text-sm font-semibold hover:bg-gray-bg">
              Cancel
            </button>
            <button onClick={handlePublish} disabled={isPublishing || !title.trim()}
              className="flex-1 bg-near-black text-white rounded-[12px] py-3 text-sm font-semibold hover:bg-black disabled:opacity-50">
              {isPublishing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  Publishing…
                </span>
              ) : 'Publish Set'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}