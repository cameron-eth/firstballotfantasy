"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DraftBoardGrid } from "@/components/DraftBoardGrid"
import DraftAnalysis from "@/components/DraftAnalysis"
import { sleeperAPI, SleeperUser, SleeperLeague, SleeperDraft, SleeperPick, SleeperPlayer } from "@/lib/sleeper-api"
import { Users, Trophy, AlertCircle, Loader2, Info, BarChart3 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from '@/lib/auth'

export default function DraftBuddyPage() {
  const { user: authUser } = useAuth()
  const [username, setUsername] = useState("")
  const [user, setUser] = useState<SleeperUser | null>(null)
  const [leagues, setLeagues] = useState<SleeperLeague[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("")
  const [drafts, setDrafts] = useState<SleeperDraft[]>([])
  const [selectedDraft, setSelectedDraft] = useState<string>("")
  const [picks, setPicks] = useState<SleeperPick[]>([])
  const [players, setPlayers] = useState<Record<string, SleeperPlayer>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [profileChecked, setProfileChecked] = useState(false)
  const [noSleeperUsername, setNoSleeperUsername] = useState(false)

  // Cache keys
  const SLEEPER_USERNAME_CACHE_KEY = 'firstballot_sleeper_username'
  const SLEEPER_USER_CACHE_KEY = 'firstballot_sleeper_user'
  const SLEEPER_LEAGUES_CACHE_KEY = 'firstballot_sleeper_leagues'
  const CACHE_EXPIRY_KEY = 'firstballot_cache_expiry'
  const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  // Cache utility functions
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null
      
      const data = JSON.parse(cached)
      return data
    } catch (error) {
      console.error('Error reading from cache:', error)
      return null
    }
  }

  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('Error writing to cache:', error)
    }
  }

  const isCacheValid = () => {
    const expiry = getCachedData(CACHE_EXPIRY_KEY)
    if (!expiry) return false
    return Date.now() < expiry
  }

  const setCacheExpiry = () => {
    setCachedData(CACHE_EXPIRY_KEY, Date.now() + CACHE_DURATION)
  }

  const clearCache = () => {
    try {
      localStorage.removeItem(SLEEPER_USERNAME_CACHE_KEY)
      localStorage.removeItem(SLEEPER_USER_CACHE_KEY)
      localStorage.removeItem(SLEEPER_LEAGUES_CACHE_KEY)
      localStorage.removeItem(CACHE_EXPIRY_KEY)
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  // On mount, fetch the user settings for Sleeper username
  useEffect(() => {
    if (!authUser?.id) {
      console.log('No authenticated user found')
      return
    }

    const loadSettings = async () => {
      try {
        // Check cache first
        if (isCacheValid()) {
          const cachedUsername = getCachedData(SLEEPER_USERNAME_CACHE_KEY)
          const cachedUser = getCachedData(SLEEPER_USER_CACHE_KEY)
          const cachedLeagues = getCachedData(SLEEPER_LEAGUES_CACHE_KEY)
          
          if (cachedUsername) {
            console.log('Using cached Sleeper username:', cachedUsername)
            setUsername(cachedUsername)
            setNoSleeperUsername(false)
            
            if (cachedUser && cachedLeagues) {
              console.log('Using cached Sleeper data')
              setUser(cachedUser)
              setLeagues(cachedLeagues)
              if (cachedLeagues.length === 1) {
                setSelectedLeagueId(cachedLeagues[0].league_id)
              }
            } else {
              // Auto-connect if username is cached but user/leagues aren't
              await connectUser()
            }
            setProfileChecked(true)
            return
          }
        }

        // If no cache or cache expired, fetch from API
        const response = await fetch(`/api/settings?userId=${authUser.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.sleeper_username) {
            setUsername(data.sleeper_username)
            setNoSleeperUsername(false)
            
            // Cache the username
            setCachedData(SLEEPER_USERNAME_CACHE_KEY, data.sleeper_username)
            setCacheExpiry()
            
            // Auto-connect if username is saved
            await connectUser()
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

  // Connect to Sleeper using username
  const connectUser = async () => {
    if (!username.trim()) {
      setError("Please enter a Sleeper username")
      return
    }
    try {
      setLoading(true)
      setError(null)
      setUser(null)
      setLeagues([])
      setSelectedLeagueId("")
      setDrafts([])
      setSelectedDraft("")
      setPicks([])
      setPlayers({})
      
      // Fetch user by username
      const userData = await sleeperAPI.getUser(username)
      
      // Validate user data
      if (!userData || !userData.user_id) {
        throw new Error("Invalid username or user not found")
      }
      
      setUser(userData)
      
      // Cache the user data
      setCachedData(SLEEPER_USER_CACHE_KEY, userData)
      
      // Fetch leagues for user
      const leaguesRes = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/2025`)
      if (!leaguesRes.ok) {
        throw new Error("Could not fetch leagues")
      }
      
      const leaguesData = await leaguesRes.json()
      
      // Validate leagues data
      if (!Array.isArray(leaguesData)) {
        throw new Error("Invalid leagues data received")
      }
      
      setLeagues(leaguesData)
      
      // Cache the leagues data
      setCachedData(SLEEPER_LEAGUES_CACHE_KEY, leaguesData)
      
      if (leaguesData.length === 1) {
        setSelectedLeagueId(leaguesData[0].league_id)
      }
      
      setLoading(false)
    } catch (err: any) {
      console.error('Connection error:', err)
      setError(err.message || "Failed to connect to Sleeper. Please check your username and try again.")
      setLoading(false)
      // Reset user state on error
      setUser(null)
      setLeagues([])
      setSelectedLeagueId("")
      setDrafts([])
      setSelectedDraft("")
      setPicks([])
      setPlayers({})
    }
  }

  // Fetch drafts for selected league
  useEffect(() => {
    const fetchDrafts = async () => {
      if (!selectedLeagueId) return
      setLoading(true)
      setDrafts([])
      setSelectedDraft("")
      setPicks([])
      setPlayers({})
      try {
        const drafts = await sleeperAPI.getLeagueDrafts(selectedLeagueId)
        setDrafts(drafts)
        if (drafts.length === 1) setSelectedDraft(drafts[0].draft_id)
      } catch (err) {
        setError("Failed to get drafts for the selected league.")
      } finally {
        setLoading(false)
      }
    }
    fetchDrafts()
  }, [selectedLeagueId])

  // Load draft data when draft changes
  useEffect(() => {
    const loadDraftData = async () => {
      if (!selectedDraft) return
      setLoading(true)
      setError(null)
      try {
        const [picksData, playersData] = await Promise.all([
          sleeperAPI.getDraftPicks(selectedDraft),
          sleeperAPI.getAllPlayers()
        ])
        setPicks(picksData)
        setPlayers(playersData)
        setLastRefresh(new Date())
      } catch (err) {
        setError("Failed to load draft data")
      } finally {
        setLoading(false)
      }
    }
    loadDraftData()
  }, [selectedDraft])

  const selectedDraftData = drafts.find(d => d.draft_id === selectedDraft)

  const getDraftStatusColor = (status: string) => {
    switch (status) {
      case 'pre_draft': return 'bg-blue-500'
      case 'in_progress': return 'bg-green-500'
      case 'complete': return 'bg-gray-500'
      default: return 'bg-yellow-500'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
        <div className="space-y-6">
          {/* Show message if no sleeper username found */}
          {noSleeperUsername && profileChecked && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="text-center py-8">
                <div className="space-y-4">
                  <p className="text-red-400 font-mono">
                    Sleeper username not found in your profile. Please set it in your user settings.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Input
                      placeholder="Enter your Sleeper username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button 
                      onClick={connectUser}
                      disabled={loading || !username.trim()}
                      className="bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "CONNECT"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connection Section */}
          {!user && profileChecked && !noSleeperUsername && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">CONNECT SLEEPER</CardTitle>
                <p className="text-gray-300 text-sm">
                  Enter your Sleeper username to connect your account
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
                  onClick={connectUser}
                  disabled={loading}
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "CONNECT"
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
          {user && leagues.length > 0 && !selectedLeagueId && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">SELECT LEAGUE</CardTitle>
                <p className="text-gray-300 text-sm">
                  Choose a league to view drafts
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leagues.map((league) => (
                    <Card 
                      key={league.league_id} 
                      className={`p-4 cursor-pointer transition-all hover:border-yellow-400 hover:bg-slate-700 ${
                        selectedLeagueId === league.league_id ? 'border-yellow-400 ring-2 ring-yellow-400 bg-slate-700' : 'bg-slate-800 border-slate-700'
                      }`}
                      onClick={() => setSelectedLeagueId(league.league_id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl font-bold text-yellow-400">#{league.league_id.slice(-2)}</div>
                          <div>
                            <h3 className="font-semibold text-slate-100">{league.name}</h3>
                            <p className="text-sm text-gray-400">{league.season} • {league.status}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs px-2 py-1 ${
                          league.status === 'active' ? 'bg-green-400/20 text-green-400 border-green-400' :
                          league.status === 'pre_draft' ? 'bg-blue-400/20 text-blue-400 border-blue-400' :
                          'bg-gray-400/20 text-gray-400 border-gray-400'
                        }`}>
                          {league.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-slate-200">
                        <div className="flex justify-between">
                          <span>Teams:</span>
                          <span className="text-slate-100">{league.total_rosters || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sport:</span>
                          <span className="text-slate-100">{league.sport?.toUpperCase() || 'NFL'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Season:</span>
                          <span className="text-slate-100">{league.season}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Draft ID:</span>
                          <span className="text-slate-100">{league.draft_id ? 'Available' : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">League ID:</span>
                          <span className="text-slate-300 font-mono">{league.league_id}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Draft Select */}
          {user && selectedLeagueId && drafts.length > 0 && !selectedDraft && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">SELECT DRAFT</CardTitle>
                <p className="text-gray-300 text-sm">
                  Choose a draft to view the board
                </p>
              </CardHeader>
              <CardContent>
                <Select value={selectedDraft} onValueChange={setSelectedDraft}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-100 focus:ring-0 focus:border-yellow-400">
                    <SelectValue placeholder="Select a draft" className="text-slate-100" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                    {drafts.map((draft) => (
                      <SelectItem key={draft.draft_id} value={draft.draft_id} className="bg-slate-800 text-slate-100 hover:bg-slate-700 focus:bg-slate-700 focus:text-yellow-400">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getDraftStatusColor(draft.status)}`}></div>
                          <span>
                            {draft.type} Draft ({draft.settings.rounds} rounds, {draft.settings.teams} teams)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Draft Board */}
          {selectedDraftData && picks.length > 0 && (
            <>
              <DraftBoardGrid
                draft={selectedDraftData}
                picks={picks}
                players={players}
                onRefresh={async () => {
                  if (selectedDraft) {
                    setLoading(true)
                    try {
                      const [picksData, playersData] = await Promise.all([
                        sleeperAPI.getDraftPicks(selectedDraft),
                        sleeperAPI.getAllPlayers()
                      ])
                      setPicks(picksData)
                      setPlayers(playersData)
                      setLastRefresh(new Date())
                    } catch (err) {
                      setError("Failed to refresh draft data")
                    } finally {
                      setLoading(false)
                    }
                  }
                }}
                lastRefresh={lastRefresh}
              />
              {/* Draft Analysis */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-400 font-mono flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>DRAFT ANALYSIS</span>
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Team grades, pick breakdowns, and traded pick analysis
                  </p>
                </CardHeader>
                <CardContent>
                  <DraftAnalysis draftId={selectedDraft} />
                </CardContent>
              </Card>
            </>
          )}

          {/* Loading State */}
          {loading && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-yellow-400 mx-auto mb-4" />
                  <p className="text-green-400 font-mono">LOADING...</p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  )
} 