'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Mail, AlertCircle } from 'lucide-react'
import { useAuthForm } from '@/hooks/use-auth-form'
import { LoginForm } from './LoginForm'
import { SignUpForm } from './SignUpForm'

export function LoginView() {
  const {
    isLoading,
    error,
    signUpSuccess,
    passwordsMatch,
    setPasswordsMatch,
    handleLogin,
    handleSignUp,
  } = useAuthForm()

  const handlePasswordChange = (password: string, confirmPassword: string) => {
    setPasswordsMatch(password === confirmPassword)
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
                <p className="text-xs text-gray-400"></p>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl text-yellow-400 font-mono">ACCESS CONTROL</CardTitle>
              <CardDescription className="text-green-400">
                Create a free account to access our tools
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-400 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-mono text-sm">{error}</span>
              </div>
            )}

            {signUpSuccess && (
              <div className="bg-green-900/50 border border-green-700 text-green-400 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="font-mono text-sm font-bold">ACCOUNT CREATED SUCCESSFULLY</span>
                </div>
                <p className="text-sm font-mono">
                  Please check your email and click the confirmation link to activate your account.
                </p>
                <p className="text-xs text-green-300 mt-2">
                  You can close this window and return to sign in once your email is confirmed.
                </p>
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
                <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <SignUpForm
                  onSubmit={handleSignUp}
                  isLoading={isLoading}
                  signUpSuccess={signUpSuccess}
                  passwordsMatch={passwordsMatch}
                  onPasswordChange={handlePasswordChange}
                />
              </TabsContent>
            </Tabs>
          </CardContent>

          <div className="px-6 pb-6">
            <div className="gradient-border">
              <div className="gradient-border-content text-center">
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
