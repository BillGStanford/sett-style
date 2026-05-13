import { Metadata } from 'next'
import { CanvasEditor } from '@/features/canvas/components/canvas-editor'

export const metadata: Metadata = {
  title: 'Canvas — SETT',
  description: 'Build your fashion sett.',
  robots: { index: false, follow: false },
}

interface CanvasPageProps {
  searchParams: { 
    set?: string;    // Load existing set (owner edit)
    edit?: string;   // Remix/edit another user's set
    remix?: string;  // Explicit remix mode (optional)
  }
}

export default function CanvasPage({ searchParams }: CanvasPageProps) {
  // Determine mode from URL params
  const { set: existingSetId, edit: editSetId, remix: remixSetId } = searchParams
  
  // Priority: remix > edit > set > create
  const mode = remixSetId ? 'remix' : editSetId ? 'remix' : existingSetId ? 'edit' : 'create'
  const targetSetId = remixSetId || editSetId || existingSetId

  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      <CanvasEditor 
        setId={targetSetId} 
        mode={mode}
        originalSetId={mode === 'remix' ? (remixSetId || editSetId) : undefined}
      />
    </div>
  )
}