'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useSubscription } from '@/hooks/use-subscription'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  Crown,
  Zap,
  Users,
  BarChart3,
  Shield,
  ArrowRight,
  CreditCard,
  ExternalLink,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { StripePaymentLinks } from '@/lib/stripe-payment-links'
import { supabase } from '@/lib/supabase'
import { userApi } from '@/lib/user-api'

const PRICING_PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      '1 League Connection',
      'Basic Analytics',
      'Draft Buddy (1 league)',
      'Community Support',
    ],
    buttonText: 'Current Plan',
    popular: false,
    paymentLink: null,
  },
  {
    name: 'Pro Monthly',
    price: '$7',
    period: '/month',
    description: 'Unlock unlimited access',
    features: [
      'Unlimited League Connections',
      'Advanced Analytics',
      'Draft Buddy (all leagues)',
      'Priority Support',
      'Early Access Features',
    ],
    buttonText: 'Upgrade to Pro',
    popular: true,
    paymentLink: 'monthly', // Will be replaced with personalized link
  },
  {
    name: 'Pro Yearly',
    price: '$15',
    period: '/year',
    description: 'Best value - save 82%',
    features: [
      'Unlimited League Connections',
      'Advanced Analytics',
      'Draft Buddy (all leagues)',
      'Priority Support',
      'Early Access Features',
      '2 months free',
    ],
    buttonText: 'Upgrade to Pro',
    popular: false,
    paymentLink: 'yearly', // Will be replaced with personalized link
  },
]

function BillingSimpleContent() {
  const { user } = useAuth()
  const { subscription, loading, isSubscribed, openCustomerPortal } = useSubscription()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [emailLoading, setEmailLoading] = useState(true)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  // Fetch user's profile data from database
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return

      try {
        setEmailLoading(true)

        // Get the current session token
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No valid session')
        }

        const profile = await userApi.getUserProfile()
        // Use sleeper_username if available, otherwise fallback to email
        setUserEmail(profile.sleeper_username || profile.email || user.email || '')
      } catch (error) {
        console.error('Error fetching user profile:', error)
        // Fallback to auth user email
        setUserEmail(user.email || '')
      } finally {
        setEmailLoading(false)
      }
    }

    fetchUserProfile()
  }, [user])

  useEffect(() => {
    if (success) {
      toast.success('Subscription activated successfully!')
    } else if (canceled) {
      toast.error('Subscription was canceled')
    }
  }, [success, canceled])

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!userEmail) {
      toast.error('Unable to get your email. Please try again.')
      return
    }

    try {
      setIsProcessing(true)

      // Generate personalized payment link with user's email
      const paymentLink =
        planType === 'monthly'
          ? StripePaymentLinks.getMonthlyLinkWithEmail(userEmail)
          : StripePaymentLinks.getYearlyLinkWithEmail(userEmail)

      // Redirect to Stripe Payment Link with pre-filled email
      window.location.href = paymentLink
    } catch (error) {
      console.error('Error redirecting to payment:', error)
      toast.error('Failed to start payment process')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setIsProcessing(true)
      const url = await openCustomerPortal()
      window.location.href = url
    } catch (error) {
      console.error('Error opening customer portal:', error)
      toast.error('Failed to open billing portal')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please sign in to view billing</h1>
            <Button onClick={() => router.push('/login')}>Sign In</Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white font-mono mb-4">CHOOSE YOUR PLAN</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Start with one league for free, or unlock unlimited access with Pro
            </p>
            {userEmail && (
              <p className="text-sm text-gray-400 mt-2">
                Payment will be processed for: <span className="text-yellow-400">{userEmail}</span>
              </p>
            )}
          </div>

          {/* Current Subscription Status */}
          {loading ? (
            <div className="text-center mb-8">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING SUBSCRIPTION...</p>
            </div>
          ) : (
            subscription && (
              <div className="mb-8">
                <Card className="bg-slate-800 border-slate-700 max-w-md mx-auto">
                  <CardHeader className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Crown className="h-6 w-6 text-yellow-400 mr-2" />
                      <CardTitle className="text-white">Current Subscription</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                        {subscription.status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{subscription.plan_type.toUpperCase()}</Badge>
                    </div>

                    {isSubscribed && (
                      <div className="text-sm text-gray-400">
                        <p>
                          Next billing:{' '}
                          {new Date(subscription.current_period_end).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleManageSubscription}
                      disabled={isProcessing}
                      className="w-full bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Manage Subscription
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )
          )}

          {/* Pricing Plans */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {PRICING_PLANS.map((plan, index) => {
              // Determine if this plan should be clickable
              const isClickable = plan.paymentLink && !isSubscribed && !emailLoading
              const planType = plan.paymentLink as 'monthly' | 'yearly'

              return (
                <Card
                  key={plan.name}
                  className={`relative ${
                    plan.popular
                      ? 'bg-slate-800 border-yellow-400 shadow-lg shadow-yellow-400/25'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-yellow-400 text-slate-900 font-bold">MOST POPULAR</Badge>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <CardTitle className="text-white font-mono">{plan.name}</CardTitle>
                    <div className="flex items-baseline justify-center space-x-1">
                      <span className="text-3xl font-bold text-yellow-400">{plan.price}</span>
                      <span className="text-gray-400">{plan.period}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center space-x-3">
                          <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => {
                        // Force the click to work for testing
                        handleSubscribe(planType)
                      }}
                      disabled={false} // Temporarily disable the disabled state for testing
                      className={`w-full ${
                        plan.popular
                          ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                          Processing...
                        </>
                      ) : isSubscribed && plan.paymentLink ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Current Plan
                        </>
                      ) : emailLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          {plan.buttonText}
                          {plan.paymentLink && <ExternalLink className="h-4 w-4 ml-2" />}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-8 font-mono">
              FREQUENTLY ASKED QUESTIONS
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Can I cancel anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Yes! You can cancel your subscription at any time. You'll continue to have
                    access until the end of your current billing period.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">What happens to my data?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Your data is always safe. If you cancel, you'll still have access to your data,
                    but with free tier limitations.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Can I upgrade/downgrade?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Absolutely! You can change your plan at any time. Changes take effect
                    immediately with prorated billing.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Need help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Our support team is here to help! Contact us at support@firstballotfantasy.com
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function BillingSimplePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900">
          <Header />
          <main className="w-full px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">Loading billing information...</p>
            </div>
          </main>
        </div>
      }
    >
      <BillingSimpleContent />
    </Suspense>
  )
}
