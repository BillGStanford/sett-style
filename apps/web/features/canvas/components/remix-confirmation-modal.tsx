'use client'

import { useState } from 'react'

interface RemixAttribution {
  originalTitle: string
  originalCreator: string
  revenueSharePct: number
}

interface Props {
  attribution: RemixAttribution
  onConfirm: () => void
  onCancel: () => void
}

export function RemixConfirmationModal({ attribution, onConfirm, onCancel }: Props) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-near-black">Remix This Set?</h3>
            <p className="text-sm text-gray-tertiary mt-1">
              You're about to create your own version of:
            </p>
          </div>
        </div>
        
        <div className="bg-gray-bg rounded-xl p-4 mb-6">
          <p className="font-semibold text-near-black">"{attribution.originalTitle}"</p>
          <p className="text-sm text-gray-primary">by @{attribution.originalCreator}</p>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="agree-remix"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 accent-near-black"
            />
            <label htmlFor="agree-remix" className="text-sm text-gray-primary">
              <span className="font-semibold text-near-black">I understand that:</span>
              <ul className="list-disc list-inside mt-1 space-y-1 text-gray-tertiary">
                <li>This creates a new set in my account</li>
                <li>{attribution.revenueSharePct}% of affiliate earnings from my remix will be shared with @{attribution.originalCreator} for 30 days</li>
                <li>The original set will be credited with a link</li>
                <li>I can edit everything: items, layout, text, and styling</li>
              </ul>
            </label>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 border border-gray-border rounded-xl py-3 text-sm font-semibold hover:bg-gray-bg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={!agreed}
            className="flex-1 bg-near-black text-white rounded-xl py-3 text-sm font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Yes, Remix This Look
          </button>
        </div>
      </div>
    </div>
  )
}