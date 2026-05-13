'use client'

import { useAuthStore } from '@/lib/store/auth-store'

interface EditSetButtonProps {
  setUserId: string
  setId: string
  canRemix?: boolean      // NEW
  allowRemixes?: boolean  // NEW
}

export function EditSetButton({ 
  setUserId, 
  setId, 
  canRemix = false,
  allowRemixes = true,
}: EditSetButtonProps) {
  const { user, isAuthenticated } = useAuthStore()
  const isOwner = user?.id === setUserId
  
  // Determine href and label based on ownership and permissions
  let href = '/auth/login'
  let label = 'Sign in to edit'
  
  if (isAuthenticated) {
    if (isOwner) {
      // Owner edits their own set
      href = `/canvas?set=${setId}`
      label = 'Edit this set'
    } else if (canRemix && allowRemixes) {
      // Non-owner can remix
      href = `/canvas?remix=${setId}`
      label = 'Remix this set'
    } else if (!allowRemixes) {
      // Remix disabled by creator
      label = 'Remixing disabled'
      href = '#'
    } else {
      // Not published or private
      label = 'Set not remixable'
      href = '#'
    }
  }
  
  // Don't render button if disabled state
  if (!isOwner && (!canRemix || !allowRemixes) && label.includes('disabled')) {
    return null
  }
  
  return (
    <a
      href={href}
      className={`text-xs underline underline-offset-2 transition-colors inline-flex items-center gap-1.5 ${
        label.includes('disabled') || label.includes('not remixable')
          ? 'text-gray-300 cursor-not-allowed'
          : 'text-gray-tertiary hover:text-near-black'
      }`}
      onClick={(e) => {
        if (label.includes('disabled') || label.includes('not remixable')) {
          e.preventDefault()
        }
      }}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
      {label} →
    </a>
  )
}