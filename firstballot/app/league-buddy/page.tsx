"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import LeagueBuddy from "@/components/LeagueBuddy"
import { AlertCircle, Loader2, Info, Trophy, Users, BarChart3, Crown } from "lucide-react"
import { useAuth } from '@/lib/auth'
import { AuthGuard } from "@/components/auth-guard"
import { useMembershipCheck } from "@/hooks/use-membership"
import { LeagueCard } from "@/components/league-access-control"
import { UpgradePrompt } from "@/components/upgrade-prompt"
import { LoadingSpinner } from "@/components/loading-spinner"
import { cacheUtils } from "@/lib/cache-utils"
import { supabase } from "@/lib/supabase"
import { sleeperApi } from '@/lib/nextjs-cache'

export default function LeagueBuddyPage() {
  const { user: authUser } = useAuth()
  const { canAccessLeague, isMember, loading: membershipLoading } = useMembershipCheck()
  
  const [username, setUsername] = useState("")
  const [user, setUser] = useState<any>(null)
  const [leagues, setLeagues] = useState<any[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [noSleeperUsername, setNoSleeperUsername] = useState(false)
  const [showTransactionsSidebar, setShowTransactionsSidebar] = useState(false)
  const [isCacheValidState, setIsCacheValidState] = useState(false)

  // Use shared cache utility
  const { keys } = cacheUtils

  const handleTransactionsToggle = useCallback(() => {
    setShowTransactionsSidebar(prev => !prev)
  }, [])

  const handleClearCache = () => {
    cacheUtils.clear()
    setUsername("")
    setUser(null)
    setLeagues([])
    setSelectedLeagueId("")
    setNoSleeperUsername(false)
    setProfileChecked(false)
    setIsCacheValidState(false)
    // Reload settings
    if (authUser?.id) {
      const loadSettings = async () => {
        try {
          // Get the current session token
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No valid session')
          }

          const response = await fetch('/api/settings', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          })
          if (response.ok) {
            const data = await response.json()
            if (data.sleeper_username) {
              setUsername(data.sleeper_username)
              setNoSleeperUsername(false)
              await connectToSleeper()
            } else {
              setNoSleeperUsername(true)
            }
          }
          setProfileChecked(true)
        } catch (err) {
          console.error('Failed to load settings:', err)
          setProfileChecked(true)
          setNoSleeperUsername(true)
        }
      }
      loadSettings()
    }
  }

  // Check cache validity on mount (client-side only)
  useEffect(() => {
    setIsCacheValidState(cacheUtils.isValid())
  }, [])

  // On mount, fetch the user settings for Sleeper username
  useEffect(() => {
    if (!authUser?.id) {

      return
    }

    const loadSettings = async () => {
      try {
        // Check cache first
        if (cacheUtils.isValid()) {
          const cachedUsername = cacheUtils.get(keys.SLEEPER_USERNAME)
          const cachedUser = cacheUtils.get(keys.SLEEPER_USER)
          const cachedLeagues = cacheUtils.get(keys.SLEEPER_LEAGUES)
          
          if (cachedUsername) {
    
            setUsername(cachedUsername)
            setNoSleeperUsername(false)
            
            if (cachedUser && cachedLeagues) {
      
              setUser(cachedUser)
              setLeagues(cachedLeagues)
              if (cachedLeagues.length === 1) {
                setSelectedLeagueId(cachedLeagues[0].league_id)
              }
            } else {
              // Auto-connect if username is cached but user/leagues aren't
              await connectToSleeper()
            }
            setProfileChecked(true)
            return
          }
        }

        // If no cache or cache expired, fetch from API
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No valid session')
        }

        const response = await fetch('/api/settings', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        if (response.ok) {
          const data = await response.json()
          if (data.sleeper_username) {
            setUsername(data.sleeper_username)
            setNoSleeperUsername(false)
            
            // Cache the username
            cacheUtils.set(keys.SLEEPER_USERNAME, data.sleeper_username)
            cacheUtils.setExpiry()
            
            // Auto-connect if username is saved
            await connectToSleeper()
          } else {
            setNoSleeperUsername(true)
          }
        }
        setProfileChecked(true)
      } catch (err) {
        console.error('Failed to load settings:', err)
        setProfileChecked(true)
        setNoSleeperUsername(true)
      }
    }

    loadSettings()
  }, [authUser?.id])

  const connectToSleeper = useCallback(async () => {
    if (!username.trim()) {
      setError("Please enter a Sleeper username")
      return
    }
    try {
      setLoading(true)
      setError(null)
      setLeagues([])
      setSelectedLeagueId("")
      
      // Get user id with Next.js caching
      const userData = await sleeperApi.getUser(username) as any
      setUser(userData)
      
      // Cache the user data
      cacheUtils.set(keys.SLEEPER_USER, userData)
      
      // Get leagues with Next.js caching
      const leaguesData = await sleeperApi.getUserLeagues(userData.user_id) as any[]
      setLeagues(leaguesData)
      
      // Cache the leagues data
      cacheUtils.set(keys.SLEEPER_LEAGUES, leaguesData)
      
      if (leaguesData.length === 1) setSelectedLeagueId(leaguesData[0].league_id)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || "Failed to connect to Sleeper")
      setLoading(false)
    }
  }, [username, keys.SLEEPER_USER, keys.SLEEPER_LEAGUES])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
          <div className="space-y-6">
           

            {/* Connection Section */}
            {!user && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-400 font-mono">CONNECT TO SLEEPER</CardTitle>
                  <p className="text-gray-300 text-sm">
                    Enter your Sleeper username to view your leagues
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Sleeper Username</label>
                    <Input
                      placeholder="Enter Sleeper Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button 
                    onClick={connectToSleeper}
                    disabled={loading}
                    className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "CONNECT TO SLEEPER"
                    )}
                  </Button>
                  {error && (
                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* League Select */}
            {leagues.length > 0 && !selectedLeagueId && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                  <CardTitle className="text-green-400 font-mono">SELECT LEAGUE</CardTitle>
                  <p className="text-gray-300 text-sm">
                    Choose a league to view the dashboard
                  </p>
                    </div>
                    {!isMember && leagues.length > 1 && (
                      <div className="flex items-center space-x-2">
                        <Crown className="h-4 w-4 text-yellow-400" />
                        <span className="text-xs text-yellow-400 font-mono">FREE: 1 LEAGUE</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leagues.map((league, index) => {
                      // Always allow first league, restrict others if not member
                      const canAccess = index === 0 || isMember;
              
                      return (
                        <LeagueCard
                        key={league.league_id} 
                          league={league}
                          leagueIndex={index}
                          canAccess={canAccess}
                          isMember={isMember}
                          isSelected={selectedLeagueId === league.league_id}
                        onClick={() => setSelectedLeagueId(league.league_id)}
                        />
                      );
                    })}
                        </div>
                        
                  {/* Upgrade Prompt for Free Users with Multiple Leagues */}
                  {!isMember && leagues.length > 1 && (
                    <div className="mt-6 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Crown className="h-5 w-5 text-yellow-400" />
                          <h3 className="text-yellow-400 font-mono">UNLOCK ALL LEAGUES</h3>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Upgrade to Pro to access all {leagues.length} of your leagues
                        </p>
                        <Button 
                          onClick={() => {
                    
                            window.location.href = 'https://buy.stripe.com/test_dRm3cvdadbi5fdV3oZeAg00'
                          }}
                          className="bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                        >
                          Upgrade to Pro
                        </Button>
                          </div>
                        </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* League Buddy Dashboard */}
            {user && selectedLeagueId && (
              <LeagueBuddy leagueId={selectedLeagueId} user={user} />
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <LoadingSpinner size="lg" text="Loading league data..." />
              </div>
            )}

            {/* Membership Loading State */}
            {membershipLoading && (
              <div className="text-center py-8">
                <LoadingSpinner size="default" text="Checking membership..." />
                  </div>
            )}

          </div>
        </main>
      </div>
    </AuthGuard>
  )
} 