// lib/api/client.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// Listen for store rehydration
if (typeof window !== 'undefined') {
  import('@/lib/store/auth-store').then(({ useAuthStore }) => {
    // Set token after store rehydrates
    const token = useAuthStore.getState().token
    if (token) {
      setAuthToken(token)
    }
    
    // Subscribe to future changes
    useAuthStore.subscribe((state) => {
      setAuthToken(state.token)
    })
  })
}

export { api }