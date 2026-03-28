'use client'

import type React from 'react'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { setupFetchWithAuth } from './setup-fetch-with-auth'
import { userApi } from './user-api'
import { cacheUtils } from './cache-utils'

if (typeof window !== 'undefined') {
  setupFetchWithAuth()
}

interface AuthContextType {
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    cacheUtils.clear()
    const {
      data: { user: signedInUser },
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error

    setUser(signedInUser ?? null)

    if (signedInUser?.email) {
      const username =
        typeof signedInUser.user_metadata?.username === 'string' &&
        signedInUser.user_metadata.username.trim().length > 0
          ? signedInUser.user_metadata.username.trim()
          : signedInUser.email.split('@')[0]

      try {
        const response = await userApi.addUserProfile({
          authId: signedInUser.id,
          email: signedInUser.email,
          username,
        })

        if (!response.ok && response.status !== 409) {
          console.error('Failed to ensure user profile during sign in')
        }
      } catch (profileError) {
        console.error('Error ensuring user profile during sign in:', profileError)
      }
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })
    if (error) throw error

    // If signup is successful and we have a user, create their profile
    if (data.user) {
      try {
        const response = await userApi.addUserProfile(
          {
            authId: data.user.id,
            email: data.user.email ?? email,
            username,
          }
        )

        if (!response.ok) {
          console.error('Failed to create user profile during signup')
        }
      } catch (profileError) {
        console.error('Error creating user profile:', profileError)
      }
    }
  }

  const signOut = async () => {
    cacheUtils.clear()
    try {
      // Prefer local signout so stale/invalid refresh tokens don't block logout UX.
      const { error: localError } = await supabase.auth.signOut({ scope: 'local' })
      if (localError) {
        const { error: fallbackError } = await supabase.auth.signOut()
        if (fallbackError) {
          throw fallbackError
        }
      }
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      // Hard cleanup of persisted auth keys as final safety net.
      if (typeof window !== 'undefined') {
        const projectRef =
          process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/\/\/([^.]+)\./)?.[1] ?? ''
        const authKeyPrefix = `sb-${projectRef}-auth-token`
        try {
          localStorage.removeItem(authKeyPrefix)
          sessionStorage.removeItem(authKeyPrefix)
        } catch (storageError) {
          console.error('Failed to clear local auth storage:', storageError)
        }
      }
      // Ensure client UI updates immediately even if provider/network signout fails.
      setUser(null)
    }
  }

  const value = {
    user,
    signIn,
    signUp,
    signOut,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
