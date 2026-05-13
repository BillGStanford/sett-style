// ─── floating-toolbar.tsx ───────────────────────────────────────
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  fabricCanvas: any
  selectedObject: any
  viewportEl: HTMLDivElement | null
}

export function FloatingToolbar({ fabricCanvas, selectedObject, viewportEl }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [scale, setScale] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [hasShadow, setHasShadow] = useState(false)
  const [fontColor, setFontColor] = useState('#000000')
  const isText = selectedObject?.type === 'textbox'

  const updatePosition = useCallback(() => {
    if (!ref.current || !fabricCanvas || !selectedObject || !viewportEl) return
    const vpt = fabricCanvas.viewportTransform
    const bounds = selectedObject.getBoundingRect()
    const x = bounds.left * vpt[0] + vpt[4] + (bounds.width * vpt[0]) / 2
    const y = bounds.top * vpt[3] + vpt[5] - 48
    ref.current.style.left = `${x}px`
    ref.current.style.top = `${Math.max(4, y)}px`
  }, [fabricCanvas, selectedObject, viewportEl])

  useEffect(() => {
    if (!selectedObject || !fabricCanvas) { setVisible(false); return }
    setVisible(true)
    setScale(Math.round((selectedObject.scaleX || 1) * 100))
    setRotation(Math.round(selectedObject.angle || 0))
    setHasShadow(!!selectedObject.shadow && !selectedObject._isGlow)
    if (selectedObject.type === 'textbox') setFontColor(selectedObject.fill || '#000000')
    updatePosition()
  }, [selectedObject, fabricCanvas, updatePosition])

  useEffect(() => {
    if (!visible) return
    let raf: number
    const tick = () => { updatePosition(); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, updatePosition])

  if (!visible || !selectedObject) return null

  function applyScale(v: number) {
    const obj = fabricCanvas?.getActiveObject(); if (!obj) return
    const s = v / 100; obj.set({ scaleX: s, scaleY: s }); setScale(v)
    fabricCanvas.requestRenderAll()
  }

  function applyRotation(v: number) {
    const obj = fabricCanvas?.getActiveObject(); if (!obj) return
    obj.rotate(v); setRotation(v); fabricCanvas.requestRenderAll()
  }

  async function toggleShadow() {
    const obj = fabricCanvas?.getActiveObject(); if (!obj) return
    const { Shadow } = await import('fabric')
    if (hasShadow) { obj.set({ shadow: null, _isGlow: false }); setHasShadow(false) }
    else { obj.set({ shadow: new Shadow({ color: 'rgba(0,0,0,0.12)', blur: 20, offsetX: 0, offsetY: 6 }), _isGlow: false }); setHasShadow(true) }
    fabricCanvas.requestRenderAll()
  }

  function changeFontColor(c: string) {
    const obj = fabricCanvas?.getActiveObject(); if (!obj || obj.type !== 'textbox') return
    obj.set('fill', c); setFontColor(c); fabricCanvas.requestRenderAll()
  }

  return (
    <div ref={ref} className="absolute z-30 pointer-events-auto" style={{ transform: 'translateX(-50%)' }}>
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[9px] text-gray-400 font-medium">⤡</span>
          <input type="range" min={10} max={300} value={scale} onChange={e => applyScale(+e.target.value)} className="w-14 h-1 accent-gray-900 cursor-pointer" />
          <span className="text-[10px] text-gray-700 font-mono w-8 text-right">{scale}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-1 px-1">
          <span className="text-[9px] text-gray-400 font-medium">↻</span>
          <input type="range" min={0} max={360} value={rotation} onChange={e => applyRotation(+e.target.value)} className="w-12 h-1 accent-gray-900 cursor-pointer" />
          <span className="text-[10px] text-gray-700 font-mono w-6 text-right">{rotation}°</span>
        </div>
        {isText && (
          <>
            <div className="w-px h-4 bg-gray-200" />
            <label className="relative w-6 h-6 rounded-lg overflow-hidden cursor-pointer border border-gray-200 hover:border-gray-400 transition-colors flex items-center justify-center" title="Font Color">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: fontColor }} />
              <input type="color" value={fontColor} onChange={e => changeFontColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </>
        )}
        <div className="w-px h-4 bg-gray-200" />
        <button onClick={toggleShadow} title="Drop Shadow"
          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] transition-colors ${hasShadow ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}>
          ◐
        </button>
      </div>
    </div>
  )
}