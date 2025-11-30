'use client'

import type React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, User } from 'lucide-react'

interface SignUpFormProps {
  onSubmit: (email: string, password: string, confirmPassword: string, username: string) => void
  isLoading: boolean
  signUpSuccess: boolean
  passwordsMatch: boolean
  onPasswordChange: (password: string, confirmPassword: string) => void
}

export function SignUpForm({
  onSubmit,
  isLoading,
  signUpSuccess,
  passwordsMatch,
  onPasswordChange,
}: SignUpFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const username = formData.get('username') as string
    onSubmit(email, password, confirmPassword, username)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            disabled={signUpSuccess}
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
            disabled={signUpSuccess}
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
            disabled={signUpSuccess}
            onChange={(e) => {
              const confirmPassword = (
                document.getElementById('confirmPassword') as HTMLInputElement
              )?.value
              onPasswordChange(e.target.value, confirmPassword)
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-gray-300 font-mono">
          CONFIRM PASSWORD
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            className={`pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-400 font-mono ${
              !passwordsMatch ? 'border-red-500' : ''
            }`}
            required
            disabled={signUpSuccess}
            onChange={(e) => {
              const password = (document.getElementById('password') as HTMLInputElement)?.value
              onPasswordChange(password, e.target.value)
            }}
          />
        </div>
        {!passwordsMatch && (
          <p className="text-red-400 text-xs font-mono">Passwords do not match</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-green-400 text-slate-900 hover:bg-green-300 font-mono font-bold"
        disabled={isLoading || signUpSuccess || !passwordsMatch}
      >
        {isLoading ? 'CREATING ACCESS...' : signUpSuccess ? 'ACCOUNT CREATED' : 'CREATE ACCESS'}
      </Button>
    </form>
  )
}
