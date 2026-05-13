'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-xs font-semibold text-gray-tertiary tracking-widest uppercase mb-4">Error</p>
        <h1 className="text-4xl font-black text-near-black mb-4">Something went wrong.</h1>
        <p className="text-gray-primary mb-8 max-w-sm">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button onClick={reset} className="btn-primary px-6 py-3 text-sm">Try Again</button>
      </div>
    </div>
  )
}
