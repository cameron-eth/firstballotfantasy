import { supabase } from './supabase'

// Keep track of whether we've already set up the interceptor
let isSetup = false
let originalFetch: typeof fetch

export function setupFetchWithAuth() {
  // Prevent multiple setups
  if (isSetup || typeof window === 'undefined') {
    return
  }

  // Store the original fetch function
  originalFetch = window.fetch
  isSetup = true

  // Override the global fetch function
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      // Get the current session (this is more reliable than getSession())
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      const token = session?.access_token
      const url = typeof input === 'string' ? input : input.toString()

      // Create new headers object
      const headers = new Headers(init?.headers || {})

      // Add authorization header for API calls if we have a token
      if (token && (url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/'))) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      // Make the request with the modified headers
      return originalFetch(input, {
        ...init,
        headers,
      })
    } catch (error) {
      console.error('Error in fetch interceptor:', error)
      // Fallback to original fetch if something goes wrong
      return originalFetch(input, init)
    }
  }
}

// Function to reset the interceptor (useful for testing or cleanup)
export function resetFetchInterceptor() {
  if (isSetup && typeof window !== 'undefined' && originalFetch) {
    window.fetch = originalFetch
    isSetup = false
  }
}
