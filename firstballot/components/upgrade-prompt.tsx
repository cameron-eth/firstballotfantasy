"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Crown, Lock, Zap, Users, Trophy, CheckCircle } from "lucide-react"
import { PAYMENT_LINKS } from "@/lib/stripe-payment-links"
import { Spinner } from "@/components/ui/spinner"

interface UpgradePromptProps {
  trigger?: React.ReactNode
  title?: string
  description?: string
  variant?: 'button' | 'card' | 'dialog'
  className?: string
}

export function UpgradePrompt({ 
  trigger, 
  title = "Unlock All Leagues", 
  description = "Get unlimited access to all your leagues and premium features",
  variant = 'dialog',
  className = ""
}: UpgradePromptProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUpgrade = async (planType: 'monthly' | 'yearly') => {
    try {
      setIsProcessing(true)
      const paymentLink = PAYMENT_LINKS[planType]
      
      if (paymentLink && paymentLink.trim() !== '') {
        // Try both methods
        window.location.href = paymentLink
        // Fallback
        setTimeout(() => {
          window.open(paymentLink, '_blank')
        }, 100)
      } else {
        alert('Payment link not configured. Please contact support.')
      }
    } catch (error) {
      alert('Error processing payment. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const features = [
    "Unlimited league access",
    "Advanced analytics",
    "Priority support",
    "Premium features"
  ]

  const plans = [
    {
      name: "Monthly",
      price: "$7",
      period: "month",
      savings: "",
      popular: false,
      planType: 'monthly' as const
    },
    {
      name: "Yearly",
      price: "$15",
      period: "year",
      savings: "Save 82%",
      popular: true,
      planType: 'yearly' as const
    }
  ]

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Crown className="h-6 w-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        <p className="text-gray-300">{description}</p>
      </div>

      {/* Features */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">What's included:</h3>
        <div className="grid grid-cols-1 gap-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={`relative p-4 cursor-pointer transition-all hover:border-yellow-400 ${
              plan.popular 
                ? 'border-yellow-400 bg-slate-700/50' 
                : 'border-slate-600 bg-slate-800'
            }`}
            onClick={() => handleUpgrade(plan.planType)}
          >
            {plan.popular && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-slate-900">
                Most Popular
              </Badge>
            )}
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-white">{plan.name}</h3>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-yellow-400">
                  {plan.price}
                </div>
                <div className="text-sm text-gray-400">per {plan.period}</div>
                {plan.savings && (
                  <div className="text-xs text-green-400 font-semibold">
                    {plan.savings}
                  </div>
                )}
              </div>
              <Button 
                className="w-full bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <Spinner className="h-4 w-4" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Upgrade Now</span>
                  </div>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Security Note */}
      <div className="text-center text-xs text-gray-400">
        Secure payment powered by Stripe. Cancel anytime.
      </div>
    </div>
  )

  if (variant === 'dialog') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {trigger || (
            <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Upgrade to Pro</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  if (variant === 'card') {
    return (
      <Card className={`bg-slate-800 border-slate-700 ${className}`}>
        <CardHeader>
          <CardTitle className="text-yellow-400 font-mono flex items-center space-x-2">
            <Crown className="h-5 w-5" />
            <span>UPGRADE TO PRO</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    )
  }

  // Default button variant
  return (
    <div className={className}>
      {trigger || (
        <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </Button>
      )}
    </div>
  )
} 