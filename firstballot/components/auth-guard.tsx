'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Shield className="h-8 w-8 text-yellow-400" />
                <div>
                  <h1 className="text-xl font-bold text-green-400 font-mono">
                    FIRST BALLOT FANTASY
                  </h1>
                  <p className="text-xs text-gray-400">VERIFYING ACCESS</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">VERIFYING CREDENTIALS...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Lock className="h-8 w-8 text-red-400" />
                <div>
                  <h1 className="text-xl font-bold text-red-400 font-mono">ACCESS DENIED</h1>
                  <p className="text-xs text-gray-400">AUTHENTICATION REQUIRED</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-gray-300 font-mono">
                  You must be signed in to access this feature.
                </p>
                <p className="text-gray-400 text-sm">
                  League Buddy and Draft Buddy require authentication to protect your data and
                  provide personalized analytics.
                </p>
              </div>

              <div className="space-y-3">
                <Link href="/login">
                  <Button className="w-full bg-yellow-400 text-slate-900 hover:bg-yellow-300 font-mono font-bold">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    SIGN IN TO CONTINUE
                  </Button>
                </Link>

                <Link href="/">
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-gray-300 hover:bg-slate-700 font-mono"
                  >
                    RETURN TO HOME
                  </Button>
                </Link>
              </div>
            </CardContent>

            <div className="px-6 pb-6">
              <div className="gradient-border">
                <div className="gradient-border-content text-center">
                  <p className="text-gray-500 text-xs mt-1">
                    Your data is protected with enterprise-grade security.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
