'use client'

import type React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock } from 'lucide-react'
import Link from 'next/link'

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void
  isLoading: boolean
}

export function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    onSubmit(email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <Link
            href="/forgot-password"
            className="text-sm text-green-400 hover:text-green-300 font-mono"
          >
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
        {isLoading ? 'AUTHENTICATING...' : 'LOGIN'}
      </Button>
    </form>
  )
}
