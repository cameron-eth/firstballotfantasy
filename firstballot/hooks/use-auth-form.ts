import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export function useAuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const [passwordsMatch, setPasswordsMatch] = useState(true)
  const router = useRouter()
  const { signIn, signUp } = useAuth()

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await signIn(email, password)
      router.push('/')
    } catch (err) {
      setError('Failed to log in. Please check your credentials.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (
    email: string,
    password: string,
    confirmPassword: string,
    username: string
  ) => {
    setIsLoading(true)
    setError(null)
    setSignUpSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.')
      setIsLoading(false)
      return
    }

    try {
      await signUp(email, password, username)
      setSignUpSuccess(true)
    } catch (err) {
      setError('Failed to create account. This email might already be in use.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    signUpSuccess,
    passwordsMatch,
    setPasswordsMatch,
    handleLogin,
    handleSignUp,
  }
}
