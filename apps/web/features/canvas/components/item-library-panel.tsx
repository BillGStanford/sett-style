// ─── item-library-panel.tsx ──────────────────────────────
'use client'

import { useState, useRef } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { useItemLibrary } from '@/features/canvas/hooks/use-item-library'
import { BG_PRESETS } from './canvas-editor'

interface ItemLibraryPanelProps {
  onAddToCanvas: (item: { imageUrl: string; itemId: string; affiliateUrl: string; merchant: string; price: number; productName: string }) => void
  onChangeBackground: (preset: typeof BG_PRESETS[0]) => void
  activeBgPreset: string
}

export function ItemLibraryPanel({ onAddToCanvas, onChangeBackground, activeBgPreset }: ItemLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'add' | 'style'>('library')
  const [urlInput, setUrlInput] = useState('')
  const [isClipping, setIsClipping] = useState(false)
  const [clipError, setClipError] = useState('')
  const [clipSuccess, setClipSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { items, isLoading, error: libraryError, refetch } = useItemLibrary()
  const { token, isAuthenticated } = useAuthStore()
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const filtered = items.filter(i => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (i.product_name || '').toLowerCase().includes(q) || (i.merchant || '').toLowerCase().includes(q)
  })

  async function handleClip() {
    if (!urlInput.trim() || !isAuthenticated || !token) return
    setIsClipping(true); setClipError(''); setClipSuccess('')
    try {
      const r = await fetch(`${apiBase}/api/items/clip`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ url: urlInput.trim() }) })
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.detail || `Error ${r.status}`) }
      setUrlInput(''); setClipSuccess('Item added!'); setActiveTab('library'); setTimeout(() => setClipSuccess(''), 4000); refetch()
    } catch (e: any) { setClipError(e.message || 'Could not fetch that URL.') } finally { setIsClipping(false) }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f || !token) return
    const fd = new FormData(); fd.append('file', f)
    try { const r = await fetch(`${apiBase}/api/items/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }); if (r.ok) { setActiveTab('library'); refetch() } else setClipError('Upload failed.') } catch { setClipError('Cannot reach API.') }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDeleteItem(e: React.MouseEvent, itemId: string) {
    e.stopPropagation()
    if (!token || deletingId) return
    setDeletingId(itemId)
    try {
      const r = await fetch(`${apiBase}/api/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        refetch()
      }
    } catch {
      // silent fail — item stays
    } finally {
      setDeletingId(null)
    }
  }

  function getItemData(item: any) {
    return {
      imageUrl: item.processed_image_url || item.original_image_url || '',
      itemId: item.id, affiliateUrl: item.affiliate_url || item.original_url || '',
      merchant: item.merchant || '', price: item.price || 0, productName: item.product_name || 'Item',
    }
  }

  return (
    <div className="absolute left-0 top-12 bottom-0 z-20 w-[260px] bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="flex border-b border-gray-200">
        {(['library', 'add', 'style'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${activeTab === t ? 'text-near-black border-b-2 border-near-black' : 'text-gray-400 hover:text-near-black'}`}>
            {t === 'library' ? 'Library' : t === 'add' ? '+ Add' : 'Style'}
          </button>
        ))}
      </div>

      {activeTab === 'library' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-2.5 pb-1.5">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="5"/><path d="M21 21l-6-6"/></svg>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items…"
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 text-near-black placeholder:text-gray-400 focus:outline-none focus:border-near-black transition-colors" />
            </div>
          </div>

          <div className="px-2.5 pb-3">
            {!isAuthenticated && <div className="text-center py-8"><p className="text-xs text-gray-400">Sign in to save items.</p></div>}
            {isAuthenticated && isLoading && <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square bg-gray-50 rounded-lg animate-pulse" />)}</div>}
            {isAuthenticated && libraryError && <div className="p-2.5 bg-red-50 rounded-lg text-xs text-red-500 border border-red-100">Cannot load library.</div>}
            {isAuthenticated && !isLoading && !libraryError && filtered.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-sm font-semibold text-near-black mb-1">Nothing here yet.</p>
                <p className="text-xs text-gray-400 mb-3">Paste a URL or upload an image.</p>
                <button onClick={() => setActiveTab('add')} className="text-xs font-bold text-near-black hover:underline">Add Item</button>
              </div>
            )}
            {isAuthenticated && !isLoading && filtered.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {filtered.map(item => {
                  const ready = item.status === 'ready'
                  const data = getItemData(item)
                  const isDeleting = deletingId === item.id
                  return (
                    <div key={item.id}
                      draggable={ready && !isDeleting}
                      onDragStart={e => { if (!isDeleting) { e.dataTransfer.setData('application/sett-item', JSON.stringify(data)); e.dataTransfer.effectAllowed = 'copy' } }}
                      onClick={() => { if (ready && !isDeleting) onAddToCanvas(data) }}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border transition-all ${isDeleting ? 'border-red-200 opacity-50' : ready ? 'border-gray-200 hover:border-near-black' : 'opacity-50 border-gray-200'}`}
                      title={item.product_name || 'Item'}
                    >
                      <div className="aspect-square bg-gray-50">
                        {(item.processed_image_url || item.original_image_url) ? (
                          <img src={item.processed_image_url || item.original_image_url} alt="" className="w-full h-full object-contain" draggable={false} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {item.status === 'processing' ? <div className="w-4 h-4 border-2 border-gray-200 border-t-near-black rounded-full animate-spin" /> : <span className="text-xs text-gray-400">…</span>}
                          </div>
                        )}
                      </div>

                      {/* Delete button — top-right on hover */}
                      <button
                        onClick={(e) => handleDeleteItem(e, item.id)}
                        disabled={isDeleting}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-md bg-white/90 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-white opacity-0 group-hover:opacity-100 transition-all z-10 disabled:opacity-0"
                        title="Remove from library"
                      >
                        {isDeleting ? (
                          <div className="w-3 h-3 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        )}
                      </button>

                      {/* Add overlay — center on hover (ready items only) */}
                      {ready && !isDeleting && <div className="absolute inset-0 bg-near-black/0 group-hover:bg-near-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="text-white text-xs font-semibold">+ Add</span></div>}
                      {item.status === 'processing' && <div className="absolute bottom-0 inset-x-0 bg-white/80 text-center py-0.5"><span className="text-[10px] text-gray-400">Processing</span></div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="flex-1 p-3 space-y-4 overflow-y-auto">
          {!isAuthenticated && <div className="p-2.5 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-100 font-medium">Sign in to add items.</div>}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Clip from URL</label>
            <div className="flex gap-1.5">
              <input type="url" value={urlInput} onChange={e => { setUrlInput(e.target.value); setClipError('') }} placeholder="Paste product link…" onKeyDown={e => e.key === 'Enter' && handleClip()}
                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-near-black placeholder:text-gray-400 focus:outline-none focus:border-near-black transition-colors" />
              <button onClick={handleClip} disabled={isClipping || !isAuthenticated} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-near-black text-white hover:bg-black transition-colors disabled:opacity-40 flex-shrink-0">{isClipping ? '…' : 'Clip'}</button>
            </div>
            {clipError && <p className="text-[10px] text-red-500 mt-1">{clipError}</p>}
            {clipSuccess && <p className="text-[10px] text-green-600 mt-1">{clipSuccess}</p>}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Upload Image</label>
            <button onClick={() => isAuthenticated && fileInputRef.current?.click()} disabled={!isAuthenticated}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center justify-center cursor-pointer hover:border-near-black transition-colors disabled:opacity-40">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 mb-1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              <span className="text-xs text-gray-400">Click to upload</span>
              <span className="text-[10px] text-gray-300 mt-0.5">PNG, JPG up to 10MB</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
          </div>
        </div>
      )}

      {activeTab === 'style' && (
        <div className="flex-1 p-3 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Canvas Background</p>
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {BG_PRESETS.map(pr => (
              <button key={pr.id} onClick={() => onChangeBackground(pr)} title={pr.name}
                className={`aspect-square rounded-lg border-2 transition-all hover:scale-110 ${activeBgPreset === pr.id ? 'border-near-black scale-110' : 'border-gray-200'}`}
                style={{ background: `linear-gradient(135deg, ${pr.colors[0]}, ${pr.colors[1]})` }} />
            ))}
          </div>
          <div className="space-y-1">
            {BG_PRESETS.map(pr => (
              <button key={pr.id} onClick={() => onChangeBackground(pr)} className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left ${activeBgPreset === pr.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                <div className="w-5 h-5 rounded-md flex-shrink-0 border border-gray-200" style={{ background: `linear-gradient(135deg, ${pr.colors[0]}, ${pr.colors[1]})` }} />
                <span className={`text-xs font-medium ${activeBgPreset === pr.id ? 'text-near-black' : 'text-gray-600'}`}>{pr.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}