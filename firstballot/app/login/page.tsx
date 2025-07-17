"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { Shield, Mail, Lock, User, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { signIn, signUp } = useAuth()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await signIn(email, password)
      router.push("/")
    } catch (err) {
      setError("Failed to log in. Please check your credentials.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const username = formData.get("username") as string

    try {
      await signUp(email, password, username)
      router.push("/")
    } catch (err) {
      setError("Failed to create account. This email might already be in use.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Shield className="h-8 w-8 text-yellow-400" />
              <div>
                <h1 className="text-xl font-bold text-green-400 font-mono">FIRST BALLOT FANTASY</h1>
                <p className="text-xs text-gray-400">SECURE ACCESS PORTAL</p>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl text-yellow-400 font-mono">ACCESS CONTROL</CardTitle>
              <CardDescription className="text-green-400">Authenticate to access advanced analytics</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-400 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-mono text-sm">{error}</span>
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-700 border-slate-600">
                <TabsTrigger
                  value="login"
                  className="font-mono data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900"
                >
                  LOGIN
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="font-mono data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900"
                >
                  REGISTER
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300 font-mono">
                      EMAIL
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="user@domain.com"
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-400 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-gray-300 font-mono">
                        PASSWORD
                      </Label>
                      <Link href="/forgot-password" className="text-sm text-green-400 hover:text-green-300 font-mono">
                        FORGOT?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-400 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-yellow-400 text-slate-900 hover:bg-yellow-300 font-mono font-bold"
                    disabled={isLoading}
                  >
                    {isLoading ? "AUTHENTICATING..." : "AUTHENTICATE"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-300 font-mono">
                      USERNAME
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="username"
                        name="username"
                        placeholder="analyst_001"
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-400 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300 font-mono">
                      EMAIL
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="user@domain.com"
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-400 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-300 font-mono">
                      PASSWORD
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-400 font-mono"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-400 text-slate-900 hover:bg-green-300 font-mono font-bold"
                    disabled={isLoading}
                  >
                    {isLoading ? "CREATING ACCESS..." : "CREATE ACCESS"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>

          <div className="px-6 pb-6">
            <div className="gradient-border">
              <div className="gradient-border-content text-center">
                <p className="text-gray-400 text-xs font-mono">SECURE • ENCRYPTED • ANALYTICS-GRADE ACCESS</p>
                <p className="text-gray-500 text-xs mt-1">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
