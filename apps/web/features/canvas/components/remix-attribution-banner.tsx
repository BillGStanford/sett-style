'use client'

import Link from 'next/link'

interface Props {
  originalSetId: string
  originalTitle: string
  originalCreator: string
}

export function RemixAttributionBanner({ originalSetId, originalTitle, originalCreator }: Props) {
  return (
    <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <span className="text-xs text-amber-800">
        Remix of{' '}
        <Link 
          href={`/sets/${originalSetId}`} 
          className="font-semibold underline underline-offset-2 hover:text-amber-900"
        >
          "{originalTitle}"
        </Link>{' '}
        by @{originalCreator}
        <span className="hidden sm:inline"> • 10% of earnings shared for 30 days</span>
      </span>
    </div>
  )
}