import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UserProfile {
  id: string
  username: string | null
  email: string
  bio: string | null
  avatar_url: string | null
  goal: 'browse' | 'create' | 'earn' | null
  style_prefs: string[]
  plan: 'free' | 'pro'
  wallet_balance: number
  total_earned: number
  is_email_verified: boolean
  user_tier: 'founder' | 'early_user' | 'general'
  referral_code: string | null
  referred_by: string | null
  show_followers: boolean
  // Location (shown publicly)
  location: string | null
  // Demographic fields (only populated for own profile)
  age_range: string | null
  gender_identity: string | null
  discovery_source: string | null
  // Onboarding tracking
  onboarding_step: number | null
  onboarding_completed_at: string | null
}

interface AuthState {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isAuthReady: boolean
  setAuth: (user: UserProfile, token: string) => void
  clearAuth: () => void
  updateUser: (data: Record<string, unknown>) => void
  setAuthReady: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isAuthReady: false,

        setAuth: (user, token) => {
          set({ user, token, isAuthenticated: true })
          import('@/lib/api/client').then(({ setAuthToken }) => setAuthToken(token))
        },

        clearAuth: () => {
          set({ user: null, token: null, isAuthenticated: false })
        },

        // Accepts full API response object, merges into existing user
        updateUser: (data) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...data } : null,
          })),

        setAuthReady: () => set({ isAuthReady: true }),
      }),
      {
        name: 'sett-auth',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'sett-auth' }
  )
)