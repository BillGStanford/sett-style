// ─── properties-panel.tsx ────────────────────────────────────────
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCanvasStore } from '@/features/canvas/store/canvas-store'

interface Props {
  selectedObject: any
  fabricCanvas: any
  snapToGrid: boolean
  gridSize: number
  layerKey: number
  onDeselect: () => void
  onSave?: () => void
}

export function PropertiesPanel({ selectedObject: obj, fabricCanvas, snapToGrid, gridSize, layerKey, onDeselect, onSave }: Props) {
  const [dims, setDims] = useState({ w: 0, h: 0, x: 0, y: 0, angle: 0, opacity: 100 })
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkDesc, setLinkDesc] = useState('')
  const [linkImg, setLinkImg] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linkSaved, setLinkSaved] = useState(false)
  const [fontColor, setFontColor] = useState('#000000')
  const { setIsDirty } = useCanvasStore()

  useEffect(() => {
    if (!obj) return
    const u = () => { if (!obj) return; setDims({ w: Math.round(obj.getScaledWidth?.() || 0), h: Math.round(obj.getScaledHeight?.() || 0), x: Math.round(obj.left || 0), y: Math.round(obj.top || 0), angle: Math.round(obj.angle || 0), opacity: Math.round((obj.opacity ?? 1) * 100) }) }
    u(); const t = setInterval(u, 100); return () => clearInterval(t)
  }, [obj])

  useEffect(() => {
    if (!obj) return
    setLinkUrl(obj.linked_url || ''); setLinkTitle(obj.linked_title || obj.product_name || '')
    setLinkDesc(obj.linked_description || ''); setLinkImg(obj.linked_image_url || '')
    setLinkError(''); setLinkSaved(!!obj.linked_url)
    if (obj.type === 'textbox') setFontColor(obj.fill || '#000000')
  }, [obj])

  const isText = obj?.type === 'textbox'

  function handleSaveLink() {
    if (!linkUrl.trim()) { setLinkError('URL required.'); return }
    if (!linkTitle.trim()) { setLinkError('Title required.'); return }
    const a = fabricCanvas?.getActiveObject(); if (!a) return
    a.set({ linked_url: linkUrl.trim(), linked_title: linkTitle.trim(), linked_description: linkDesc.trim(), linked_image_url: linkImg.trim() || null })
    fabricCanvas.requestRenderAll(); setIsDirty(true); setLinkError(''); setLinkSaved(true); onSave?.(); setTimeout(() => setLinkSaved(false), 3000)
  }

  function handleRemoveLink() {
    const a = fabricCanvas?.getActiveObject(); if (!a) return
    a.set({ linked_url: null, linked_title: null, linked_description: null, linked_image_url: null })
    fabricCanvas.requestRenderAll(); setIsDirty(true); setLinkUrl(''); setLinkTitle(obj?.product_name || ''); setLinkDesc(''); setLinkImg(''); setLinkError(''); setLinkSaved(false); onSave?.()
  }

  function apply(key: string, v: number) {
    const a = fabricCanvas?.getActiveObject(); if (!a) return
    if (key === 'x') a.set('left', v)
    else if (key === 'y') a.set('top', v)
    else if (key === 'w') { const c = a.getScaledWidth?.() || 1; a.set('scaleX', (a.scaleX || 1) * (v / c)) }
    else if (key === 'h') { const c = a.getScaledHeight?.() || 1; a.set('scaleY', (a.scaleY || 1) * (v / c)) }
    else if (key === 'angle') a.rotate(v)
    else if (key === 'opacity') { a.set('opacity', v / 100); setDims(d => ({ ...d, opacity: v })) }
    fabricCanvas.requestRenderAll(); setDims(d => ({ ...d, [key]: v }))
  }

  function changeFontColor(c: string) {
    const a = fabricCanvas?.getActiveObject(); if (!a || a.type !== 'textbox') return
    a.set('fill', c); setFontColor(c); fabricCanvas.requestRenderAll(); setIsDirty(true)
  }

    function bringForward() { const a = fabricCanvas?.getActiveObject(); if (a) { fabricCanvas.bringObjectForward(a); fabricCanvas.requestRenderAll(); setIsDirty(true) } }
  function sendBackward() { const a = fabricCanvas?.getActiveObject(); if (!a) return; fabricCanvas.sendObjectBackwards(a); const bg = fabricCanvas.getObjects().find((o: any) => o.name === '__artboard_bg__'); if (bg && fabricCanvas.getObjects().indexOf(bg) !== 0) { fabricCanvas.remove(bg); fabricCanvas.insertAt(0, bg) } fabricCanvas.requestRenderAll(); setIsDirty(true) }
  function bringToFront() { const a = fabricCanvas?.getActiveObject(); if (a) { fabricCanvas.bringObjectToFront(a); fabricCanvas.requestRenderAll(); setIsDirty(true) } }
  function sendToBack() { const a = fabricCanvas?.getActiveObject(); if (!a) return; fabricCanvas.sendObjectToBack(a); const bg = fabricCanvas.getObjects().find((o: any) => o.name === '__artboard_bg__'); if (bg) fabricCanvas.bringObjectToFront(bg); fabricCanvas.requestRenderAll(); setIsDirty(true) }
  function flipH() { const a = fabricCanvas?.getActiveObject(); if (a) { a.set('flipX', !a.flipX); fabricCanvas.requestRenderAll() } }
  function flipV() { const a = fabricCanvas?.getActiveObject(); if (a) { a.set('flipY', !a.flipY); fabricCanvas.requestRenderAll() } }
  function rotateBy(d: number) { const a = fabricCanvas?.getActiveObject(); if (a) { a.rotate((a.angle || 0) + d); fabricCanvas.requestRenderAll() } }

  function deleteSelected() {
    const a = fabricCanvas?.getActiveObject(); if (!a) return
    if (a.type === 'activeselection') { a.forEachObject((o: any) => fabricCanvas.remove(o)); fabricCanvas.discardActiveObject() }
    else fabricCanvas.remove(a)
    fabricCanvas.requestRenderAll(); onDeselect()
  }

  function toggleVisibility(o: any) { o.set('visible', !o.visible); fabricCanvas.requestRenderAll(); setIsDirty(true) }
  function toggleLock(o: any) {
    const locked = o.selectable === false
    o.set({ selectable: locked, evented: locked })
    fabricCanvas.requestRenderAll(); setIsDirty(true)
  }

  // Layer list from canvas
  const layers = useMemo(() => {
    if (!fabricCanvas) return []
    return fabricCanvas.getObjects().filter((o: any) => o.name !== '__artboard_bg__').reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvas, layerKey])

  function getLayerName(o: any) {
    if (o.product_name) return o.product_name
    if (o.type === 'textbox') { const t = o.text || ''; return t.length > 16 ? t.slice(0, 16) + '…' : t }
    return o.name || 'Object'
  }

  return (
    <div className="flex-shrink-0 w-[240px] bg-white border-l border-gray-200 flex flex-col shadow-sm overflow-y-auto">
      <div className="p-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Properties</span>
        <button onClick={onDeselect} className="text-gray-400 hover:text-near-black transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {/* Product info */}
        {obj?.product_name && (
          <div className="pb-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-near-black mb-0.5 truncate">{obj.product_name}</p>
            {obj.merchant && <p className="text-[11px] text-gray-400">{obj.merchant}</p>}
            {obj.price != null && <p className="text-xs text-gray-700 font-medium mt-0.5">${Number(obj.price).toFixed(2)}</p>}
            {obj?.linked_url && <span className="inline-block mt-1 text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-semibold">✓ Linked</span>}
          </div>
        )}

        {/* Font color for text */}
        {isText && (
          <div className="pb-3 border-b border-gray-100">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Font Color</label>
            <div className="flex items-center gap-2">
              <label className="relative w-8 h-8 rounded-lg overflow-hidden cursor-pointer border border-gray-200 hover:border-near-black transition-colors" title="Pick color">
                <div className="w-full h-full" style={{ backgroundColor: fontColor }} />
                <input type="color" value={fontColor} onChange={e => changeFontColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
              <input type="text" value={fontColor} onChange={e => changeFontColor(e.target.value)}
                className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-near-black focus:outline-none focus:border-near-black" />
            </div>
          </div>
        )}

        {/* Position & Size */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Position & Size</label>
          <div className="grid grid-cols-2 gap-1.5">
            <DimInput label="X" value={dims.x} suffix="px" onChange={v => apply('x', v)} />
            <DimInput label="Y" value={dims.y} suffix="px" onChange={v => apply('y', v)} />
            <DimInput label="W" value={dims.w} suffix="px" onChange={v => apply('w', v)} />
            <DimInput label="H" value={dims.h} suffix="px" onChange={v => apply('h', v)} />
            <DimInput label="∠" value={dims.angle} suffix="°" onChange={v => apply('angle', v)} />
            <div className="bg-gray-50 rounded-lg px-2 py-1.5 flex items-center gap-1 border border-gray-200">
              <span className="text-[10px] text-gray-400">⚙</span>
              <span className="text-[10px] text-gray-400">{snapToGrid ? `snap ${gridSize}px` : 'free'}</span>
            </div>
          </div>
        </div>

        {/* Opacity */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Opacity</label>
          <div className="flex items-center gap-2">
            <input type="range" min={5} max={100} value={dims.opacity} onChange={e => apply('opacity', +e.target.value)} className="flex-1 accent-near-black cursor-pointer h-1.5" />
            <input type="number" min={5} max={100} value={dims.opacity} onChange={e => apply('opacity', Math.min(100, Math.max(5, +e.target.value)))}
              className="w-12 text-[11px] font-mono text-near-black bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1 text-center focus:outline-none focus:border-near-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <span className="text-[9px] text-gray-400">%</span>
          </div>
        </div>

        {/* Transform */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Transform</label>
          <div className="grid grid-cols-2 gap-1.5">
            <PropBtn onClick={flipH}>↔ Flip H</PropBtn>
            <PropBtn onClick={flipV}>↕ Flip V</PropBtn>
            <PropBtn onClick={() => rotateBy(-90)}>↶ -90°</PropBtn>
            <PropBtn onClick={() => rotateBy(90)}>↷ +90°</PropBtn>
          </div>
        </div>

        {/* Link */}
        <div className="pb-3 border-b border-gray-100">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            Link Item
          </label>
          <div className="space-y-1.5">
            <input type="url" value={linkUrl} onChange={e => { setLinkUrl(e.target.value); setLinkError('') }} placeholder="https://... *"
              className="w-full text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-near-black placeholder:text-gray-400 focus:outline-none focus:border-near-black" />
            <input type="text" value={linkTitle} onChange={e => { setLinkTitle(e.target.value); setLinkError('') }} placeholder="Title *"
              className="w-full text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-near-black placeholder:text-gray-400 focus:outline-none focus:border-near-black" />
            <textarea value={linkDesc} onChange={e => setLinkDesc(e.target.value)} placeholder="Description (optional)" rows={2}
              className="w-full text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-near-black placeholder:text-gray-400 focus:outline-none focus:border-near-black resize-none" />
            {linkError && <p className="text-[10px] text-red-500">{linkError}</p>}
            <div className="flex gap-1.5">
              <button onClick={handleSaveLink} className={`flex-1 text-[11px] font-semibold rounded-lg py-1.5 transition-colors ${linkSaved ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-near-black text-white hover:bg-black'}`}>
                {linkSaved ? '✓ Saved' : (obj?.linked_url ? 'Update' : 'Link')}
              </button>
              {obj?.linked_url && <button onClick={handleRemoveLink} className="text-[11px] text-gray-400 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:text-red-500 hover:border-red-200 transition-colors">✕</button>}
            </div>
          </div>
        </div>

        {/* Layer order */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Order</label>
          <div className="flex gap-1.5">
            <PropBtn onClick={bringForward}>↑ Forward</PropBtn>
            <PropBtn onClick={sendBackward}>↓ Back</PropBtn>
            <PropBtn onClick={bringToFront}>⤒ Front</PropBtn>
            <PropBtn onClick={sendToBack}>⤓ Back</PropBtn>
          </div>
        </div>

        {/* Layer list */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Layers</label>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {layers.map((o: any, i: number) => {
              const isActive = o === obj
              const isHidden = o.visible === false
              const isLocked = o.selectable === false
              return (
                <div key={i} className={`flex items-center gap-1 px-1.5 py-1 rounded-lg cursor-pointer transition-colors group ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  onClick={() => { if (isLocked) return; fabricCanvas.setActiveObject(o); fabricCanvas.requestRenderAll() }}>
                  {/* Visibility */}
                  <button onClick={e => { e.stopPropagation(); toggleVisibility(o) }} title={isHidden ? 'Show' : 'Hide'}
                    className={`w-5 h-5 flex items-center justify-center rounded text-[10px] transition-colors ${isHidden ? 'text-gray-300' : 'text-gray-400 hover:text-near-black'}`}>
                    {isHidden ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                  {/* Lock */}
                  <button onClick={e => { e.stopPropagation(); toggleLock(o) }} title={isLocked ? 'Unlock' : 'Lock'}
                    className={`w-5 h-5 flex items-center justify-center rounded text-[10px] transition-colors ${isLocked ? 'text-near-black' : 'text-gray-400 hover:text-near-black'}`}>
                    {isLocked
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>}
                  </button>
                  {/* Thumbnail or icon */}
                  <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[9px] text-gray-400">
                    {o.type === 'image' ? '🖼' : 'T'}
                  </span>
                  {/* Name */}
                  <span className={`text-[11px] truncate flex-1 ${isActive ? 'text-near-black font-medium' : 'text-gray-600'} ${isHidden ? 'opacity-40' : ''}`}>
                    {getLayerName(o)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={deleteSelected} className="w-full border border-red-200 text-red-500 rounded-lg py-2 text-xs font-medium hover:bg-red-50 transition-colors">
          Remove from canvas
        </button>
      </div>
    </div>
  )
}

function DimInput({ label, value, suffix, onChange }: { label: string; value: number; suffix: string; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  useEffect(() => { if (!editing) setDraft(String(value)) }, [value, editing])

  if (editing) {
    return (
      <div className="bg-white border border-near-black rounded-lg px-1.5 py-0.5 flex items-center gap-0.5">
        <span className="text-[10px] font-bold text-gray-400">{label}</span>
        <input type="number" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const p = parseInt(draft, 10); if (!isNaN(p)) onChange(p); setEditing(false) } if (e.key === 'Escape') { setDraft(String(value)); setEditing(false) } }}
          onBlur={() => { const p = parseInt(draft, 10); if (!isNaN(p)) onChange(p); setEditing(false) }}
          className="w-full text-[11px] font-mono text-near-black bg-transparent border-0 outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" autoFocus />
        <span className="text-[9px] text-gray-400">{suffix}</span>
      </div>
    )
  }
  return (
    <button onClick={() => setEditing(true)} className="bg-gray-50 rounded-lg px-2 py-1.5 flex items-center gap-1 hover:bg-gray-100 transition-colors text-left w-full border border-gray-200">
      <span className="text-[10px] font-bold text-gray-400">{label}</span>
      <span className="text-[11px] font-mono text-near-black flex-1">{value}</span>
      <span className="text-[9px] text-gray-400">{suffix}</span>
    </button>
  )
}

function PropBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return <button onClick={onClick} title={title} className="border border-gray-200 rounded-lg py-1.5 text-[11px] font-medium hover:bg-gray-50 transition-colors text-gray-600">{children}</button>
}