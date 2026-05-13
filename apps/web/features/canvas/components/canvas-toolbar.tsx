// ─── canvas-toolbar.tsx ──────────────────────────────────────────
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCanvasStore } from '@/features/canvas/store/canvas-store'
import { SettLogo } from '@/components/ui/sett-logo'
import { BG_PRESETS } from './canvas-editor'

interface CanvasToolbarProps {
  isSaving: boolean; isDirty: boolean; zoom: number
  showGrid: boolean; snapToGrid: boolean; smartSnap: boolean; activeBgPreset: string
  onSave: () => void; onUndo: () => void; onRedo: () => void; onPublish: () => void
  onAddText: () => void; onDuplicate: () => void; onSelectAll: () => void
  onZoomIn: () => void; onZoomOut: () => void; onZoomReset: () => void
  onToggleGrid: () => void; onToggleSnap: () => void; onToggleSmartSnap: () => void
  onAutoLayout: (type: 'grid' | 'flat-lay' | 'editorial' | 'outfit-stack') => void
  onChangeBackground: (preset: typeof BG_PRESETS[0]) => void; onDownload: () => void
}

function TBtn({ onClick, title, active, children }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }) {
  return <button onClick={onClick} title={title} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${active ? 'bg-near-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{children}</button>
}

function Div() { return <div className="w-px h-5 bg-gray-200 mx-0.5" /> }

export function CanvasToolbar(p: CanvasToolbarProps) {
  const { setSetTitle } = useCanvasStore()
  const [showLayout, setShowLayout] = useState(false)
  const [showBg, setShowBg] = useState(false)

  return (
    <div className="flex-shrink-0 h-12 bg-white border-b border-gray-200 flex items-center px-3 gap-1.5 z-30">
      <Link href="/feed" className="flex-shrink-0 mr-2"><SettLogo className="h-4" /></Link>
      <div className="w-px h-5 bg-gray-200" />
      <input type="text" value={p.setSetTitle} onChange={e => setSetTitle(e.target.value)} onBlur={e => { if (!e.target.value.trim()) setSetTitle('Untitled Set') }} maxLength={100} placeholder="Untitled Set"
        className="text-sm font-semibold text-near-black bg-transparent border-0 outline-none w-44 ml-2 hover:bg-gray-50 focus:bg-gray-50 focus:px-2 focus:py-0.5 focus:rounded-lg transition-all cursor-text" />

      <div className="flex items-center gap-0.5 mx-auto bg-gray-50 rounded-xl p-0.5">
        <TBtn onClick={p.onUndo} title="Undo (Ctrl+Z)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/></svg></TBtn>
        <TBtn onClick={p.onRedo} title="Redo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/></svg></TBtn>
        <Div />
        <TBtn onClick={p.onAddText} title="Add Text (T)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg></TBtn>
        <TBtn onClick={p.onDuplicate} title="Duplicate"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg></TBtn>
        <Div />

        {/* Auto Style */}
        <div className="relative">
          <TBtn onClick={() => { setShowLayout(v => !v); setShowBg(false) }} title="Auto Style" active={showLayout}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </TBtn>
          {showLayout && (<>
            <div className="fixed inset-0 z-40" onClick={() => setShowLayout(false)} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">Auto Style</p>
              {[{ id: 'grid' as const, l: 'Grid', i: '⊞' }, { id: 'flat-lay' as const, l: 'Flat Lay', i: '⋈' }, { id: 'editorial' as const, l: 'Editorial', i: '◇' }, { id: 'outfit-stack' as const, l: 'Outfit Stack', i: '≡' }].map(x => (
                <button key={x.id} onClick={() => { p.onAutoLayout(x.id); setShowLayout(false) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><span className="text-gray-900 font-bold w-4 text-center">{x.i}</span>{x.l}</button>
              ))}
            </div>
          </>)}
        </div>

        {/* Background */}
        <div className="relative">
          <TBtn onClick={() => { setShowBg(v => !v); setShowLayout(false) }} title="Background">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>
          </TBtn>
          {showBg && (<>
            <div className="fixed inset-0 z-40" onClick={() => setShowBg(false)} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 pt-1 pb-2">Background</p>
              <div className="grid grid-cols-5 gap-1.5">
                {BG_PRESETS.map(pr => (
                  <button key={pr.id} onClick={() => { p.onChangeBackground(pr); setShowBg(false) }} title={pr.name}
                    className={`aspect-square rounded-lg border-2 transition-all hover:scale-110 ${p.activeBgPreset === pr.id ? 'border-near-black scale-110' : 'border-transparent'}`}
                    style={{ background: `linear-gradient(135deg, ${pr.colors[0]}, ${pr.colors[1]})` }} />
                ))}
              </div>
            </div>
          </>)}
        </div>

        <Div />
        <TBtn onClick={p.onToggleGrid} title="Grid" active={p.showGrid}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg></TBtn>
        <TBtn onClick={p.onToggleSnap} title="Snap" active={p.snapToGrid}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></TBtn>
        <TBtn onClick={p.onToggleSmartSnap} title="Smart Align" active={p.smartSnap}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 3H3v18h18V3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg></TBtn>
        <Div />
        <TBtn onClick={p.onZoomOut} title="Zoom Out"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6M11 8H6"/><circle cx="11" cy="11" r="5"/></svg></TBtn>
        <span className="text-[11px] font-mono text-gray-700 min-w-[38px] text-center select-none">{p.zoom}%</span>
        <TBtn onClick={p.onZoomIn} title="Zoom In"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6M11 8h6M14 11v-6"/><circle cx="11" cy="11" r="5"/></svg></TBtn>
        <TBtn onClick={p.onZoomReset} title="Reset"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg></TBtn>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <TBtn onClick={p.onSelectAll} title="Select All"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></TBtn>
        {p.isDirty && !p.isSaving && <span className="text-[10px] text-amber-600 font-medium hidden lg:block">Unsaved</span>}
        {p.isSaving && <span className="text-[10px] text-gray-400 hidden lg:block">Saving…</span>}
        <button onClick={p.onSave} disabled={p.isSaving || !p.isDirty} className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-gray-200 hover:border-near-black transition-colors disabled:opacity-40">Save</button>
        <button onClick={p.onDownload} className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-gray-200 hover:border-near-black transition-colors gap-1.5 inline-flex items-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
        <button onClick={p.onPublish} className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-near-black text-white hover:bg-black transition-colors">Publish</button>
      </div>
    </div>
  )
}