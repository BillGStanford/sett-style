// ─── canvas-editor.tsx ───────────────────────────────────────────
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasToolbar } from './canvas-toolbar'
import { ItemLibraryPanel } from './item-library-panel'
import { PropertiesPanel } from './properties-panel'
import { PublishModal } from './publish-modal'
import { FloatingToolbar } from './floating-toolbar'
import { useCanvasStore } from '@/features/canvas/store/canvas-store'
import { useAuthStore } from '@/lib/store/auth-store'

const FREE_ITEM_LIMIT = 25
const GRID_SIZE = 20
const ZOOM_MIN = 0.05
const ZOOM_MAX = 10
const BOARD_W = 1080
const BOARD_H = 1080
const SNAP_THRESHOLD = 8

const CANVAS_CUSTOM_PROPS = [
  'item_id', 'affiliate_url', 'merchant', 'price', 'product_name', 'name',
  'linked_url', 'linked_title', 'linked_description', 'linked_image_url',
]

export const BG_PRESETS = [
  { id: 'white', name: 'White', colors: ['#ffffff', '#f8f8f8'], angle: 180 },
  { id: 'cream', name: 'Cream', colors: ['#f5f0eb', '#ebe3d9'], angle: 135 },
  { id: 'y2k', name: 'Y2K', colors: ['#f0c6f7', '#c4b5fd'], angle: 135 },
  { id: 'dark-academia', name: 'Dark Academia', colors: ['#2c2420', '#1a1614'], angle: 180 },
  { id: 'minimal', name: 'Minimal Luxury', colors: ['#e8e4e0', '#d4cfc9'], angle: 135 },
  { id: 'magazine', name: 'Magazine', colors: ['#faf8f5', '#f0ece6'], angle: 180 },
  { id: 'pinterest', name: 'Pinterest', colors: ['#fce4ec', '#e8eaf6'], angle: 135 },
  { id: 'streetwear', name: 'Streetwear', colors: ['#1a1a1a', '#2d2d2d'], angle: 180 },
  { id: 'cottagecore', name: 'Cottagecore', colors: ['#f0f4e8', '#e4ebd4'], angle: 135 },
  { id: 'noir', name: 'Noir', colors: ['#0a0a0a', '#1a1a1a'], angle: 180 },
]

function gradientCoords(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180
  return { x1: w / 2 - Math.cos(rad) * w / 2, y1: h / 2 - Math.sin(rad) * h / 2, x2: w / 2 + Math.cos(rad) * w / 2, y2: h / 2 + Math.sin(rad) * h / 2 }
}

function findSnap(obj: any, canvas: any) {
  if (Math.abs(obj.angle || 0) > 3) return { snapX: null, snapY: null, guides: [] as { axis: 'x' | 'y'; pos: number }[] }
  const objW = obj.getScaledWidth(), objH = obj.getScaledHeight()
  const objCX = obj.left + objW / 2, objCY = obj.top + objH / 2
  let snapX: number | null = null, snapY: number | null = null
  let minDX = SNAP_THRESHOLD, minDY = SNAP_THRESHOLD
  const guides: { axis: 'x' | 'y'; pos: number }[] = []

  const trySnapX = (targetPos: number, newSX: number) => {
    guides.push({ axis: 'x', pos: targetPos })
    if (!snapX) { snapX = newSX; minDX = 0 }
  }
  const trySnapY = (targetPos: number) => {
    if (!guides.find(g => g.axis === 'y' && Math.abs(g.pos - targetPos) < 2))
      guides.push({ axis: 'y', pos: targetPos })
  }

  for (const pos of [0, BOARD_W / 2, BOARD_W]) {
    let d = Math.abs(objCX - pos)
    if (d < minDX) { minDX = d; snapX = pos - objW / 2; guides.length = 0; trySnapX(pos, snapX) }
    d = Math.abs(obj.left - pos)
    if (d < minDX) { minDX = d; snapX = pos; guides.length = 0; trySnapX(pos, snapX) }
    d = Math.abs(obj.left + objW - pos)
    if (d < minDX) { minDX = d; snapX = pos - objW; guides.length = 0; trySnapX(pos, snapX) }
  }
  for (const pos of [0, BOARD_H / 2, BOARD_H]) {
    let d = Math.abs(objCY - pos)
    if (d < minDY) { minDY = d; snapY = pos - objH / 2; trySnapY(pos) }
    d = Math.abs(obj.top - pos)
    if (d < minDY) { minDY = d; snapY = pos; trySnapY(pos) }
    d = Math.abs(obj.top + objH - pos)
    if (d < minDY) { minDY = d; snapY = pos - objH; trySnapY(pos) }
  }

  const others = canvas.getObjects().filter((o: any) => o !== obj && o.name !== '__artboard_bg__' && Math.abs(o.angle || 0) <= 3)
  for (const other of others) {
    const ow = other.getScaledWidth(), oh = other.getScaledHeight()
    const ocx = other.left + ow / 2, ocy = other.top + oh / 2
    let d = Math.abs(objCX - ocx)
    if (d < minDX) { minDX = d; snapX = ocx - objW / 2; guides.length = 0; trySnapX(ocx, snapX) }
    d = Math.abs(objCY - ocy)
    if (d < minDY) { minDY = d; snapY = ocy - objH / 2; trySnapY(ocy) }
    d = Math.abs(obj.left - other.left)
    if (d < minDX) { minDX = d; snapX = other.left; guides.length = 0; trySnapX(other.left, snapX) }
    d = Math.abs(obj.left + objW - other.left - ow)
    if (d < minDX) { minDX = d; snapX = other.left + ow - objW; guides.length = 0; trySnapX(other.left + ow, snapX) }
    d = Math.abs(obj.top - other.top)
    if (d < minDY) { minDY = d; snapY = other.top; trySnapY(other.top) }
    d = Math.abs(obj.top + objH - other.top - oh)
    if (d < minDY) { minDY = d; snapY = other.top + oh - objH; trySnapY(other.top + oh) }
  }

  return { snapX, snapY, guides: guides.filter((g, i, a) => a.findIndex(g2 => g2.axis === g.axis && Math.abs(g2.pos - g.pos) < 2) === i) }
}

type LayoutType = 'grid' | 'flat-lay' | 'editorial' | 'outfit-stack'

function computeLayout(type: LayoutType, objects: any[]) {
  if (!objects.length) return []
  const pad = 60, gap = 30

  if (type === 'grid') {
    const cols = Math.ceil(Math.sqrt(objects.length))
    const cellW = (BOARD_W - pad * 2 - gap * (cols - 1)) / cols
    const rows = Math.ceil(objects.length / cols)
    const cellH = (BOARD_H - pad * 2 - gap * (rows - 1)) / rows
    return objects.map((obj, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const s = Math.min(cellW / (obj.width || 1), cellH / (obj.height || 1), 1)
      return { obj, x: pad + col * (cellW + gap) + (cellW - obj.width * s) / 2, y: pad + row * (cellH + gap) + (cellH - obj.height * s) / 2, scaleX: s, scaleY: s, angle: 0 }
    })
  }
  if (type === 'flat-lay') {
    const avgSize = 180
    const positions: { x: number; y: number; rotation: number }[] = []
    for (let i = 0; i < objects.length; i++) {
      let bx = BOARD_W / 2, by = BOARD_H / 2, bd = 0
      for (let a = 0; a < 30; a++) {
        const x = pad + Math.random() * (BOARD_W - pad * 2), y = pad + Math.random() * (BOARD_H - pad * 2)
        let md = Infinity
        for (const p of positions) md = Math.min(md, Math.hypot(x - p.x, y - p.y))
        if (!positions.length || md > bd) { bd = md; bx = x; by = y }
      }
      positions.push({ x: bx, y: by, rotation: (Math.random() - 0.5) * 10 })
    }
    return objects.map((obj, i) => {
      const s = Math.min(avgSize / (obj.width || 1), avgSize / (obj.height || 1), 1)
      const p = positions[i]
      return { obj, x: p.x - (obj.width * s) / 2, y: p.y - (obj.height * s) / 2, scaleX: s, scaleY: s, angle: p.rotation }
    })
  }
  if (type === 'editorial') {
    const sorted = [...objects].sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))
    const r: any[] = []
    if (sorted.length >= 1) {
      const big = sorted[0], s = Math.min((BOARD_W * 0.5) / (big.width || 1), (BOARD_H * 0.6) / (big.height || 1), 1)
      r.push({ obj: big, x: BOARD_W * 0.15, y: BOARD_H * 0.2, scaleX: s, scaleY: s, angle: 0 })
    }
    const small = sorted.slice(1), sx = BOARD_W * 0.55, sy = BOARD_H * 0.08, cw = BOARD_W * 0.35, rh = BOARD_H * 0.28
    small.forEach((obj, i) => {
      const s = Math.min(cw / (obj.width || 1), rh / (obj.height || 1), 0.85)
      r.push({ obj, x: sx + (i % 2) * (cw + gap), y: sy + Math.floor(i / 2) * (rh + gap), scaleX: s, scaleY: s, angle: (Math.random() - 0.5) * 4 })
    })
    return r
  }
  if (type === 'outfit-stack') {
    const ch = Math.min(220, (BOARD_H - pad * 2) / objects.length)
    return objects.map((obj, i) => {
      const s = Math.min(200 / (obj.width || 1), ch / (obj.height || 1), 1)
      return { obj, x: BOARD_W / 2 - (obj.width * s) / 2 + (Math.random() - 0.5) * 30, y: pad + i * (ch * 0.75), scaleX: s, scaleY: s, angle: (Math.random() - 0.5) * 3 }
    })
  }
  return []
}

function animateTo(canvas: any, targets: any[], onDone?: () => void) {
  const dur = 450, t0 = performance.now()
  const starts = targets.map(t => ({ x: t.obj.left, y: t.obj.top, sx: t.obj.scaleX, sy: t.obj.scaleY, a: t.obj.angle || 0 }))
  ;(function frame(now: number) {
    const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3)
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i], s = starts[i]
      t.obj.set({ left: s.x + (t.x - s.x) * e, top: s.y + (t.y - s.y) * e, scaleX: s.sx + (t.scaleX - s.sx) * e, scaleY: s.sy + (t.scaleY - s.sy) * e, angle: s.a + (t.angle - s.a) * e })
    }
    canvas.requestRenderAll()
    if (p < 1) requestAnimationFrame(frame)
    else { targets.forEach(t => t.obj.set({ left: t.x, top: t.y, scaleX: t.scaleX, scaleY: t.scaleY, angle: t.angle })); canvas.requestRenderAll(); onDone?.() }
  })(t0)
}


function animateBounce(obj: any, canvas: any) {
  const tsx = obj.scaleX, tsy = obj.scaleY, start = 0.88, dur = 280, t0 = performance.now()
  obj.set({ scaleX: tsx * start, scaleY: tsy * start }); canvas.requestRenderAll()
  ;(function frame(now: number) {
    const p = Math.min((now - t0) / dur, 1), s = start + (1 - start) * (1 - Math.pow(1 - p, 3))
    obj.set({ scaleX: tsx * s, scaleY: tsy * s }); canvas.requestRenderAll()
    if (p < 1) requestAnimationFrame(frame)
    else obj.set({ scaleX: tsx, scaleY: tsy })
  })(t0)
}

interface Props {
  setId?: string
  editSetId?: string
}

export function CanvasEditor({ setId: existingSetId, editSetId }: Props) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<string[]>([])
  const historyIdx = useRef(-1)
  const isPanningRef = useRef(false)
  const spaceHeldRef = useRef(false)
  const lastPanRef = useRef({ x: 0, y: 0 })
  const initDoneRef = useRef(false)
  const snapRef = useRef(false)
  const smartSnapRef = useRef(true)
  const guideHRef = useRef<HTMLDivElement>(null)
  const guideVRef = useRef<HTMLDivElement>(null)
  const bgPresetRef = useRef(BG_PRESETS[0])

  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [itemCount, setItemCount] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [smartSnap, setSmartSnap] = useState(true)
  const [activeBgPreset, setActiveBgPreset] = useState(BG_PRESETS[0].id)
  const [artboardFrame, setArtboardFrame] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [layerKey, setLayerKey] = useState(0)

  useEffect(() => { snapRef.current = snapToGrid }, [snapToGrid])
  useEffect(() => { smartSnapRef.current = smartSnap }, [smartSnap])

  const { setId, setSetId, setTitle, setSetTitle, isDirty, setIsDirty } = useCanvasStore()
  const { user, token } = useAuthStore()
  const isPro = user?.plan === 'pro'
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const updateFrame = useCallback(() => {
    const c = fabricRef.current; if (!c) return
    const v = c.viewportTransform
    setArtboardFrame({ x: v[4], y: v[5], w: BOARD_W * v[0], h: BOARD_H * v[3] })
  }, [])

  const applyZoom = useCallback((c: any, nz: number, sx: number, sy: number) => {
    const v = c.viewportTransform.slice(), oz = v[0], r = canvasRef.current?.getBoundingClientRect(); if (!r) return
    const cx = sx - r.left, cy = sy - r.top, dx = (cx - v[4]) / oz, dy = (cy - v[5]) / oz
    v[0] = nz; v[3] = nz; v[4] = cx - dx * nz; v[5] = cy - dy * nz
    c.setViewportTransform(v); c.requestRenderAll(); setZoom(nz); updateFrame()
  }, [updateFrame])

  const zoomIn = useCallback(() => { const c = fabricRef.current, vp = viewportRef.current; if (!c || !vp) return; const r = vp.getBoundingClientRect(); applyZoom(c, Math.min(zoom * 1.25, ZOOM_MAX), r.left + r.width / 2, r.top + r.height / 2) }, [zoom, applyZoom])
  const zoomOut = useCallback(() => { const c = fabricRef.current, vp = viewportRef.current; if (!c || !vp) return; const r = vp.getBoundingClientRect(); applyZoom(c, Math.max(zoom / 1.25, ZOOM_MIN), r.left + r.width / 2, r.top + r.height / 2) }, [zoom, applyZoom])
  const zoomReset = useCallback(() => { const c = fabricRef.current, vp = viewportRef.current; if (!c || !vp) return; const p = 80, f = Math.min((vp.clientWidth - p * 2) / BOARD_W, (vp.clientHeight - p * 2) / BOARD_H, 1); c.setViewportTransform([f, 0, 0, f, (vp.clientWidth - BOARD_W * f) / 2, (vp.clientHeight - BOARD_H * f) / 2]); c.requestRenderAll(); setZoom(f); updateFrame() }, [updateFrame])
  const zoomTo100 = useCallback(() => { const c = fabricRef.current, vp = viewportRef.current; if (!c || !vp) return; c.setViewportTransform([1, 0, 0, 1, (vp.clientWidth - BOARD_W) / 2, (vp.clientHeight - BOARD_H) / 2]); c.requestRenderAll(); setZoom(1); updateFrame() }, [updateFrame])
  const toggleGrid = useCallback(() => setShowGrid(p => !p), [])
  const toggleSmartSnap = useCallback(() => setSmartSnap(p => !p), [])

  const changeBackground = useCallback(async (preset: typeof BG_PRESETS[0]) => {
    const c = fabricRef.current; if (!c) return
    bgPresetRef.current = preset; setActiveBgPreset(preset.id)
    const { Gradient } = await import('fabric')
    const coords = gradientCoords(preset.angle, BOARD_W, BOARD_H)
    const grad = new Gradient({ type: 'linear', coords, colorStops: [{ offset: 0, color: preset.colors[0] }, { offset: 1, color: preset.colors[1] }] })
    const bg = c.getObjects().find((o: any) => o.name === '__artboard_bg__')
    if (bg) { bg.set('fill', grad); c.requestRenderAll(); setIsDirty(true) }
  }, [setIsDirty])

  const applyAutoLayout = useCallback((type: LayoutType) => {
    const c = fabricRef.current; if (!c) return
    const objs = c.getObjects().filter((o: any) => o.name !== '__artboard_bg__')
    if (!objs.length) return
    const targets = computeLayout(type, objs)
    animateTo(c, targets, () => { setIsDirty(true); saveHistory(c); setLayerKey(k => k + 1) })
  }, [])

  const exportWithWatermark = useCallback((opts: { format: 'blob' | 'dataURL' }) => {
    const c = fabricRef.current; if (!c) return null
    const sv = c.viewportTransform.slice(); c.setViewportTransform([1, 0, 0, 1, 0, 0])
    const { Text: FT } = require('fabric')
    const wm = new FT('sett.style', { fontSize: 48, fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fill: '#000000', opacity: 0.25, originX: 'right', originY: 'bottom', left: BOARD_W - 20, top: BOARD_H - 20, selectable: false, evented: false })
    c.add(wm); c.renderAll()
    const result = c.toDataURL({ format: 'png', quality: 0.92, left: 0, top: 0, width: BOARD_W, height: BOARD_H, multiplier: 2 })
    c.remove(wm); c.setViewportTransform(sv); c.renderAll()
    return result
  }, [])

  const downloadImage = useCallback(() => { const d = exportWithWatermark({ format: 'dataURL' }); if (d) { const a = document.createElement('a'); a.download = `sett-style-${Date.now()}.png`; a.href = d; a.click() } }, [exportWithWatermark])
  const getWatermarkedData = useCallback(() => exportWithWatermark({ format: 'dataURL' }), [exportWithWatermark])

  function saveHistory(c: any) {
    const j = JSON.stringify(c.toJSON(CANVAS_CUSTOM_PROPS))
    historyRef.current = historyRef.current.slice(0, historyIdx.current + 1)
    historyRef.current.push(j)
    if (historyRef.current.length > 50) historyRef.current.shift()
    historyIdx.current = historyRef.current.length - 1
  }
  function doUndo(c: any) { if (historyIdx.current <= 0) return; historyIdx.current--; c.loadFromJSON(JSON.parse(historyRef.current[historyIdx.current]), () => { c.renderAll(); setLayerKey(k => k + 1) }) }
  function doRedo(c: any) { if (historyIdx.current >= historyRef.current.length - 1) return; historyIdx.current++; c.loadFromJSON(JSON.parse(historyRef.current[historyIdx.current]), () => { c.renderAll(); setLayerKey(k => k + 1) }) }

  function showGuides(guides: { axis: 'x' | 'y'; pos: number }[]) {
    const c = fabricRef.current; if (!c) return
    const v = c.viewportTransform
    const h = guides.find(g => g.axis === 'y'), vg = guides.find(g => g.axis === 'x')
    if (guideHRef.current) { if (h) { guideHRef.current.style.display = 'block'; guideHRef.current.style.top = `${h.pos * v[3] + v[5]}px` } else guideHRef.current.style.display = 'none' }
    if (guideVRef.current) { if (vg) { guideVRef.current.style.display = 'block'; guideVRef.current.style.left = `${vg.pos * v[0] + v[4]}px` } else guideVRef.current.style.display = 'none' }
  }
  function hideGuides() { if (guideHRef.current) guideHRef.current.style.display = 'none'; if (guideVRef.current) guideVRef.current.style.display = 'none' }

  // ─── Drop from library ──────────────────────────────────────
  function handleViewportDrop(e: React.DragEvent) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/sett-item')
    if (!raw) return
    try {
      const item = JSON.parse(raw)
      addItemToCanvasAt(item, e.clientX, e.clientY)
    } catch {}
  }

  function addItemToCanvasAt(item: { imageUrl: string; itemId: string; affiliateUrl: string; merchant: string; price: number; productName: string }, clientX: number, clientY: number) {
    const c = fabricRef.current; if (!c) return
    if (!isPro && itemCount >= FREE_ITEM_LIMIT) { alert(`Free plan: ${FREE_ITEM_LIMIT} items max.`); return }
    import('fabric').then(({ FabricImage }) => {
      FabricImage.fromURL(item.imageUrl, { crossOrigin: 'anonymous' }).then((img: any) => {
        if (!fabricRef.current) return
        const maxDim = 220, s = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1))
        img.scale(s)
        const rect = canvasRef.current.getBoundingClientRect(), vpt = c.viewportTransform
        const x = (clientX - rect.left - vpt[4]) / vpt[0], y = (clientY - rect.top - vpt[5]) / vpt[3]
        img.set({ left: x, top: y, originX: 'center', originY: 'center', item_id: item.itemId, affiliate_url: item.affiliateUrl, merchant: item.merchant, price: item.price, product_name: item.productName })
        c.add(img); c.setActiveObject(img); c.requestRenderAll()
        animateBounce(img, c)
      }).catch(console.error)
    })
  }

  function addItemToCanvasCenter(item: { imageUrl: string; itemId: string; affiliateUrl: string; merchant: string; price: number; productName: string }) {
    const c = fabricRef.current; if (!c) return
    if (!isPro && itemCount >= FREE_ITEM_LIMIT) { alert(`Free plan: ${FREE_ITEM_LIMIT} items max.`); return }
    import('fabric').then(({ FabricImage }) => {
      FabricImage.fromURL(item.imageUrl, { crossOrigin: 'anonymous' }).then((img: any) => {
        if (!fabricRef.current) return
        const maxDim = 220, s = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1))
        img.scale(s)
        img.set({ left: BOARD_W / 2, top: BOARD_H / 2, originX: 'center', originY: 'center', item_id: item.itemId, affiliate_url: item.affiliateUrl, merchant: item.merchant, price: item.price, product_name: item.productName })
        c.add(img); c.setActiveObject(img); c.requestRenderAll()
        animateBounce(img, c)
      }).catch(console.error)
    })
  }

  // ─── Init canvas ────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current, vp = viewportRef.current
    if (!el || !vp || initDoneRef.current) return
    let disposed = false, canvasInstance: any = null
    let keyH: ((e: KeyboardEvent) => void) | null = null, keyU: ((e: KeyboardEvent) => void) | null = null, wheelH: ((e: WheelEvent) => void) | null = null

    import('fabric').then(({ Canvas, Rect, Textbox: FT, Gradient, Shadow }) => {
      if (disposed) return
      const vpW = vp.clientWidth, vpH = vp.clientHeight
      const canvas = new Canvas(el, { width: vpW, height: vpH, backgroundColor: 'transparent', preserveObjectStacking: true, selection: true, stopContextMenu: true, renderOnAddRemove: false })
      canvasInstance = canvas; fabricRef.current = canvas

      const preset = bgPresetRef.current
      const coords = gradientCoords(preset.angle, BOARD_W, BOARD_H)
      const grad = new Gradient({ type: 'linear', coords, colorStops: [{ offset: 0, color: preset.colors[0] }, { offset: 1, color: preset.colors[1] }] })
      canvas.add(new Rect({ left: 0, top: 0, width: BOARD_W, height: BOARD_H, fill: grad, selectable: false, evented: false, name: '__artboard_bg__' }))

      const p = 80, fz = Math.min((vpW - p * 2) / BOARD_W, (vpH - p * 2) / BOARD_H, 1)
      canvas.setViewportTransform([fz, 0, 0, fz, (vpW - BOARD_W * fz) / 2, (vpH - BOARD_H * fz) / 2])
      setZoom(fz); setArtboardFrame({ x: (vpW - BOARD_W * fz) / 2, y: (vpH - BOARD_H * fz) / 2, w: BOARD_W * fz, h: BOARD_H * fz })
      initDoneRef.current = true

      const bump = () => setLayerKey(k => k + 1)

      canvas.on('selection:created', (e: any) => setSelectedObj(e.selected?.[0]?.name === '__artboard_bg__' ? null : e.selected?.[0] ?? null))
      canvas.on('selection:updated', (e: any) => setSelectedObj(e.selected?.[0]?.name === '__artboard_bg__' ? null : e.selected?.[0] ?? null))
      canvas.on('selection:cleared', () => { setSelectedObj(null); hideGuides() })
      canvas.on('object:modified', () => { setIsDirty(true); saveHistory(canvas); hideGuides(); bump() })
      canvas.on('object:added', () => { setIsDirty(true); setItemCount(canvas.getObjects().filter((o: any) => o.name !== '__artboard_bg__').length); saveHistory(canvas); bump() })
      canvas.on('object:removed', () => { setIsDirty(true); setItemCount(canvas.getObjects().filter((o: any) => o.name !== '__artboard_bg__').length); bump() })

      canvas.on('object:moving', (e: any) => {
        const obj = e.target
        if (snapRef.current) obj.set({ left: Math.round(obj.left / GRID_SIZE) * GRID_SIZE, top: Math.round(obj.top / GRID_SIZE) * GRID_SIZE })
        if (smartSnapRef.current && !snapRef.current) { const sn = findSnap(obj, canvas); if (sn.snapX !== null) obj.set('left', sn.snapX); if (sn.snapY !== null) obj.set('top', sn.snapY); showGuides(sn.guides) }
        const hw = (obj.width * obj.scaleX) / 2, hh = (obj.height * obj.scaleY) / 2
        if (obj.left < -hw * 0.5) obj.left = -hw * 0.5
        if (obj.top < -hh * 0.5) obj.top = -hh * 0.5
        if (obj.left > BOARD_W - hw * 0.5) obj.left = BOARD_W - hw * 0.5
        if (obj.top > BOARD_H - hh * 0.5) obj.top = BOARD_H - hh * 0.5
        if (!obj._isDragging) { obj._isDragging = true; obj._savedShadow = obj.shadow; if (!obj.shadow) obj.set('shadow', new Shadow({ color: 'rgba(0,0,0,0.1)', blur: 16, offsetX: 0, offsetY: 4 })) }
      })

      canvas.on('mouse:up', () => {
        for (const o of canvas.getObjects()) { if (o._isDragging) { o._isDragging = false; if (!o._savedShadow && !o._isGlow) o.set('shadow', null); else if (o._savedShadow) o.set('shadow', o._savedShadow); delete o._savedShadow } }
      })

      canvas.on('mouse:down', (opt: any) => {
        if (opt.e?.pointerId != null) { try { canvas.upperCanvasEl?.setPointerCapture(opt.e.pointerId) } catch {} }
        if (spaceHeldRef.current || opt.e?.button === 1) { isPanningRef.current = true; lastPanRef.current = { x: opt.e.clientX, y: opt.e.clientY } }
      })
      canvas.on('mouse:move', (opt: any) => {
        if (!isPanningRef.current) return
        const e = opt.e, v = canvas.viewportTransform.slice()
        v[4] += e.clientX - lastPanRef.current.x; v[5] += e.clientY - lastPanRef.current.y
        canvas.setViewportTransform(v); canvas.requestRenderAll()
        lastPanRef.current = { x: e.clientX, y: e.clientY }
        setArtboardFrame({ x: v[4], y: v[5], w: BOARD_W * v[0], h: BOARD_H * v[3] })
      })
      canvas.on('mouse:up', () => { isPanningRef.current = false })

      keyH = (e: KeyboardEvent) => {
        if (disposed) return
        const tag = (e.target as HTMLElement).tagName; if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if (e.code === 'Space' && !e.repeat) { e.preventDefault(); spaceHeldRef.current = true; canvas.defaultCursor = 'grab'; canvas.hoverCursor = 'grab'; return }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(canvas) }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(canvas) }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doSave(canvas) }
        if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); zoomIn() }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoomOut() }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); zoomReset() }
        if ((e.ctrlKey || e.metaKey) && e.key === '1') { e.preventDefault(); zoomTo100() }
        if (e.key === 't' || e.key === 'T') { if (!e.ctrlKey && !e.metaKey) doAddText(canvas, FT) }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const a = canvas.getActiveObject()
          if (!a || a.name === '__artboard_bg__') return
          if (a.type === 'activeselection') { a.forEachObject((o: any) => canvas.remove(o)); canvas.discardActiveObject() }
          else canvas.remove(a)
          canvas.renderAll()
        }
        if (e.key === '=' && !e.ctrlKey && !e.metaKey) zoomIn()
        if (e.key === '-' && !e.ctrlKey && !e.metaKey) zoomOut()
      }
      keyU = (e: KeyboardEvent) => { if (e.code === 'Space') { spaceHeldRef.current = false; if (!isPanningRef.current) { canvas.defaultCursor = 'default'; canvas.hoverCursor = 'move' } } }
      window.addEventListener('keydown', keyH); window.addEventListener('keyup', keyU)

      wheelH = (e: WheelEvent) => {
        if (disposed) return; e.preventDefault()
        if (e.ctrlKey || e.metaKey) {
          const v = canvas.viewportTransform.slice(), oz = v[0]
          let nz = Math.round(Math.min(Math.max(oz * (1 - e.deltaY / 300), ZOOM_MIN), ZOOM_MAX) * 100) / 100
          const r = canvasRef.current?.getBoundingClientRect(); if (!r) return
          const cx = e.clientX - r.left, cy = e.clientY - r.top, dx = (cx - v[4]) / oz, dy = (cy - v[5]) / oz
          v[0] = nz; v[3] = nz; v[4] = cx - dx * nz; v[5] = cy - dy * nz
          canvas.setViewportTransform(v); canvas.requestRenderAll(); setZoom(nz)
          setArtboardFrame({ x: v[4], y: v[5], w: BOARD_W * v[0], h: BOARD_H * v[3] })
        } else {
          const v = canvas.viewportTransform.slice(); v[4] -= e.deltaX; v[5] -= e.deltaY
          canvas.setViewportTransform(v); canvas.requestRenderAll()
          setArtboardFrame({ x: v[4], y: v[5], w: BOARD_W * v[0], h: BOARD_H * v[3] })
        }
      }
      el.addEventListener('wheel', wheelH, { passive: false })

      if (existingSetId) loadSet(existingSetId, canvas); else if (editSetId) editSet(editSetId, canvas); else createDraft()
      canvas.renderAll()
    })

    return () => {
      disposed = true; initDoneRef.current = false
      if (keyH) window.removeEventListener('keydown', keyH)
      if (keyU) window.removeEventListener('keyup', keyU)
      if (wheelH && canvasRef.current) canvasRef.current.removeEventListener('wheel', wheelH)
      if (canvasInstance) { canvasInstance.dispose(); fabricRef.current = null }
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    const onR = () => { const c = fabricRef.current, v = viewportRef.current; if (!c || !v) return; c.setDimensions({ width: v.clientWidth, height: v.clientHeight }); c.renderAll() }
    window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR)
  }, [])

  useEffect(() => { const t = setInterval(() => { if (isDirty && setId && fabricRef.current) doSave(fabricRef.current) }, 60_000); return () => clearInterval(t) }, [isDirty, setId])

  async function loadSet(id: string, canvas: any) {
    if (!token) return
    try {
      const res = await fetch(`${apiBase}/api/canvas/${id}`, { headers: { Authorization: `Bearer ${token}` } }); if (!res.ok) return
      const data = await res.json(); setSetId(id); if (data.title) setSetTitle(data.title)
      if (data.canvas_json?.objects) {
        for (const obj of data.canvas_json.objects) {
          if (obj.src) { const fu = obj.src.startsWith('/') ? `${apiBase}${obj.src}` : obj.src; if (fu.includes('localhost') || fu.startsWith(apiBase)) obj.src = `/api/proxy-image?src=${encodeURIComponent(fu)}` }
        }
      }
      if (data.canvas_json && Object.keys(data.canvas_json).length > 0) {
        canvas.loadFromJSON(data.canvas_json, () => {
          let bg = canvas.getObjects().find((o: any) => o.name === '__artboard_bg__')
          if (bg) { canvas.remove(bg); canvas.insertAt(0, bg) }
          else { import('fabric').then(({ Rect, Gradient }) => { const pr = bgPresetRef.current, co = gradientCoords(pr.angle, BOARD_W, BOARD_H), gr = new Gradient({ type: 'linear', coords: co, colorStops: [{ offset: 0, color: pr.colors[0] }, { offset: 1, color: pr.colors[1] }] }); canvas.insertAt(0, new Rect({ left: 0, top: 0, width: BOARD_W, height: BOARD_H, fill: gr, selectable: false, evented: false, name: '__artboard_bg__' })); canvas.renderAll() }) }
          canvas.renderAll(); setItemCount(canvas.getObjects().filter((o: any) => o.name !== '__artboard_bg__').length); setLayerKey(k => k + 1)
        })
      }
    } catch {}
  }

  async function editSet(editId: string, canvas: any) {
    if (!token) return
    setIsEditing(true)
    try {
      const res = await fetch(`${apiBase}/api/sets/${editId}/edit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('Edit set failed:', errData)
        router.push('/feed')
        return
      }
      const data = await res.json()
      await loadSet(data.id, canvas)
      setLibraryRefreshKey(prev => prev + 1)
    } catch (err) {
      console.error('Edit set error:', err)
      router.push('/feed')
    } finally {
      setIsEditing(false)
    }
  }

  async function createDraft() {
    if (!token) return
    try { const res = await fetch(`${apiBase}/api/sets`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: 'Untitled Set', canvas_json: {}, is_published: false }) }); if (res.ok) { const d = await res.json(); setSetId(d.id) } } catch {}
  }

  async function doSave(canvas: any) {
    if (!setId || !token || !canvas) return; setIsSaving(true)
    try {
      const json = canvas.toJSON(), live = canvas.getObjects()
      ;(json.objects || []).forEach((s: any, i: number) => { const l = live[i]; if (!l) return; for (const p of CANVAS_CUSTOM_PROPS) { const v = l[p]; if (v !== undefined && v !== null) s[p] = v } })
      await fetch(`${apiBase}/api/canvas/${setId}/autosave`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ canvas_json: json, title: setSetTitle }) })
      setIsDirty(false)
    } catch {} finally { setIsSaving(false) }
  }

  function doAddText(canvas: any, Textbox: any) {
    const t = new Textbox('Your text here', { left: BOARD_W / 2, top: BOARD_H / 2, originX: 'center', originY: 'center', width: 200, fontSize: 24, fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fill: '#0A0A0A', editable: true })
    canvas.add(t); canvas.setActiveObject(t); canvas.renderAll(); animateBounce(t, canvas); t.enterEditing?.(); t.selectAll?.()
  }

  function duplicateSelected() {
    const c = fabricRef.current; if (!c) return; const a = c.getActiveObject()
    if (!a || a.name === '__artboard_bg__') return
    a.clone((cl: any) => { cl.set({ left: cl.left + 20, top: cl.top + 20 }); c.add(cl); c.setActiveObject(cl); c.renderAll(); animateBounce(cl, c) })
  }

  function selectAll() {
    const c = fabricRef.current; if (!c) return
    const objs = c.getObjects().filter((o: any) => o.name !== '__artboard_bg__'); if (!objs.length) return
    c.discardActiveObject()
    import('fabric').then(({ ActiveSelection }) => { if (!fabricRef.current) return; fabricRef.current.setActiveObject(new ActiveSelection(objs, { canvas: fabricRef.current })); fabricRef.current.renderAll() })
  }

  function exportArtboard(): string | null {
    const c = fabricRef.current; if (!c) return null
    const sv = c.viewportTransform.slice(); c.setViewportTransform([1, 0, 0, 1, 0, 0]); c.renderAll()
    const d = c.toDataURL({ format: 'png', quality: 0.92, left: 0, top: 0, width: BOARD_W, height: BOARD_H })
    c.setViewportTransform(sv); c.renderAll(); return d
  }

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white flex flex-col">
      <CanvasToolbar
        isSaving={isSaving} isDirty={isDirty} zoom={zoomPercent}
        showGrid={showGrid} snapToGrid={snapToGrid} smartSnap={smartSnap} activeBgPreset={activeBgPreset}
        onSave={() => fabricRef.current && doSave(fabricRef.current)}
        onUndo={() => fabricRef.current && doUndo(fabricRef.current)}
        onRedo={() => fabricRef.current && doRedo(fabricRef.current)}
        onPublish={() => setIsPublishOpen(true)}
        onAddText={() => { if (!fabricRef.current) return; import('fabric').then(({ Textbox }) => doAddText(fabricRef.current, Textbox)) }}
        onDuplicate={duplicateSelected} onSelectAll={selectAll}
        onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomReset={zoomReset}
        onToggleGrid={toggleGrid} onToggleSnap={() => setSnapToGrid(p => !p)} onToggleSmartSnap={toggleSmartSnap}
        onAutoLayout={applyAutoLayout} onChangeBackground={changeBackground} onDownload={downloadImage}
      />

      <div className="flex flex-1 min-h-0">
        <ItemLibraryPanel
          key={libraryRefreshKey}
          onAddToCanvas={addItemToCanvasCenter}
          onChangeBackground={changeBackground}
          activeBgPreset={activeBgPreset}
        />

        <div
          ref={viewportRef}
          className="flex-1 relative overflow-hidden bg-[#e8e8e8]"
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDrop={handleViewportDrop}
          style={{
            backgroundImage: showGrid ? `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)` : 'none',
            backgroundSize: showGrid ? `${GRID_SIZE}px ${GRID_SIZE}px` : '0',
          }}
        >
          <canvas ref={canvasRef} />

          <div className="absolute pointer-events-none z-[2]" style={{ left: artboardFrame.x, top: artboardFrame.y, width: artboardFrame.w, height: artboardFrame.h, borderRadius: 6, boxShadow: '0 0 0 9999px rgba(232,232,232,0.5), 0 8px 30px rgba(0,0,0,0.12)' }} />

          <div ref={guideHRef} className="absolute left-0 right-0 h-px bg-blue-500 opacity-60 pointer-events-none z-[6]" style={{ display: 'none' }} />
          <div ref={guideVRef} className="absolute top-0 bottom-0 w-px bg-blue-500 opacity-60 pointer-events-none z-[6]" style={{ display: 'none' }} />

          <FloatingToolbar fabricCanvas={fabricRef.current} selectedObject={selectedObj} viewportEl={viewportRef.current} />

          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-1">
            <TBtn onClick={zoomOut} title="Zoom Out"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg></TBtn>
            <button onClick={zoomReset} className="text-[11px] font-mono text-gray-700 min-w-[44px] text-center hover:bg-gray-100 rounded px-1 py-0.5" title="Fit">{zoomPercent}%</button>
            <TBtn onClick={zoomIn} title="Zoom In"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></TBtn>
          </div>

          {!isPro && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"><span className={`text-xs px-3 py-1.5 rounded-full border shadow-sm ${itemCount >= FREE_ITEM_LIMIT ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white text-gray-400 border-gray-200'}`}>{itemCount}/{FREE_ITEM_LIMIT} items{itemCount >= FREE_ITEM_LIMIT ? ' — Upgrade' : ''}</span></div>}

          <div className="absolute bottom-4 right-[260px] z-10 pointer-events-none"><span className="text-[10px] px-2 py-1 rounded bg-white border border-gray-200 text-gray-400 shadow-sm">{BOARD_W} × {BOARD_H}</span></div>

          {(showGrid || snapToGrid || smartSnap) && <div className="absolute top-4 right-[260px] z-10 pointer-events-none"><span className="text-[10px] px-2 py-1 rounded bg-white/90 border border-gray-200 text-gray-400 shadow-sm">{showGrid && 'Grid '}{showGrid && (snapToGrid || smartSnap) && '· '}{snapToGrid && `Snap ${GRID_SIZE}px`}{snapToGrid && smartSnap && ' · '}{smartSnap && 'Smart Align'}</span></div>}

          <div className="absolute top-4 left-4 z-10 pointer-events-none select-none"><span className="text-[10px] px-2 py-1 rounded bg-white/80 border border-gray-200 text-gray-400 shadow-sm">Space+Drag to pan · Ctrl+Scroll to zoom</span></div>
        </div>

        <PropertiesPanel
          selectedObject={selectedObj} fabricCanvas={fabricRef.current}
          snapToGrid={snapToGrid} gridSize={GRID_SIZE} layerKey={layerKey}
          onDeselect={() => { fabricRef.current?.discardActiveObject(); fabricRef.current?.renderAll(); setSelectedObj(null) }}
          onSave={() => fabricRef.current && doSave(fabricRef.current)}
        />
      </div>

      {isPublishOpen && <PublishModal fabricCanvas={fabricRef.current} setId={setId} exportArtboard={exportArtboard} exportWatermarkedArtboard={getWatermarkedData} onClose={() => setIsPublishOpen(false)} onPublished={(id) => { setIsPublishOpen(false); router.push(`/sets/${id}`) }} />}

      {isEditing && (
        <div className="absolute inset-0 z-[100] bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-border border-t-near-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-near-black">Cloning items to your library...</p>
            <p className="text-xs text-gray-tertiary mt-1">This only takes a moment.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function TBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return <button onClick={onClick} title={title} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-600">{children}</button>
}