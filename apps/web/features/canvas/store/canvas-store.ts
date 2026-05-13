import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface CanvasState {
  setId: string | null
  setTitle: string
  isDirty: boolean
  lastSavedAt: Date | null
  isLibraryOpen: boolean
  
  // NEW: Remix/Edit mode state
  mode: 'create' | 'edit' | 'remix'
  originalSetId: string | null  // For remix: points to source set
  remixAttribution: {           // For remix: attribution info
    originalTitle: string;
    originalCreator: string;
    revenueSharePct: number;
  } | null
  
  setSetId: (id: string) => void
  setSetTitle: (title: string) => void
  setIsDirty: (dirty: boolean) => void
  setLastSavedAt: (date: Date) => void
  toggleLibrary: () => void
  
  // NEW: Mode setters
  setMode: (mode: 'create' | 'edit' | 'remix') => void
  setOriginalSetId: (id: string | null) => void
  setRemixAttribution: (attribution: CanvasState['remixAttribution']) => void
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set) => ({
      setId: null,
      setTitle: 'Untitled Set',
      isDirty: false,
      lastSavedAt: null,
      isLibraryOpen: true,
      
      // NEW defaults
      mode: 'create',
      originalSetId: null,
      remixAttribution: null,
      
      setSetId: (id) => set({ setId: id }),
      setSetTitle: (title) => set({ setTitle: title, isDirty: true }),
      setIsDirty: (dirty) => set({ isDirty: dirty }),
      setLastSavedAt: (date) => set({ lastSavedAt: date, isDirty: false }),
      toggleLibrary: () => set((s) => ({ isLibraryOpen: !s.isLibraryOpen })),
      
      // NEW setters
      setMode: (mode) => set({ mode }),
      setOriginalSetId: (id) => set({ originalSetId: id }),
      setRemixAttribution: (attribution) => set({ remixAttribution: attribution }),
    }),
    { name: 'sett-canvas' }
  )
)