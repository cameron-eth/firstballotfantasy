"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { debugEspnIdResolution, getEspnIdCacheStats, clearEspnIdCache } from "@/lib/player-utils"
import { loadEspnPlayersData } from "@/lib/player-utils"

interface EspnIdDebuggerProps {
  className?: string
}

export function EspnIdDebugger({ className = "" }: EspnIdDebuggerProps) {
  const [playerName, setPlayerName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [team, setTeam] = useState("")
  const [position, setPosition] = useState("")
  const [espnId, setEspnId] = useState("")
  const [debugResult, setDebugResult] = useState<any>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const debugPlayer = async () => {
    setLoading(true)
    try {
      const player = {
        playerName,
        first_name: firstName,
        last_name: lastName,
        team,
        position,
        espn_id: espnId || undefined
      }

      const espnPlayersData = await loadEspnPlayersData()
      const debugInfo = debugEspnIdResolution(player, espnPlayersData)
      setDebugResult(debugInfo)

      // Get cache stats
      const stats = getEspnIdCacheStats()
      setCacheStats(stats)
    } catch (error) {
      console.error('Debug error:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearCache = () => {
    clearEspnIdCache()
    setCacheStats(getEspnIdCacheStats())
    setDebugResult(null)
  }

  const getCacheStats = () => {
    const stats = getEspnIdCacheStats()
    setCacheStats(stats)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>ESPN ID Debugger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Player Name</label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g., Josh Allen"
              />
            </div>
            <div>
              <label className="text-sm font-medium">ESPN ID (if known)</label>
              <Input
                value={espnId}
                onChange={(e) => setEspnId(e.target.value)}
                placeholder="e.g., 14874"
              />
            </div>
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g., Josh"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g., Allen"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Team</label>
              <Input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="e.g., BUF"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Position</label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g., QB"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={debugPlayer} disabled={loading}>
              {loading ? "Debugging..." : "Debug Player"}
            </Button>
            <Button onClick={getCacheStats} variant="outline">
              Get Cache Stats
            </Button>
            <Button onClick={clearCache} variant="destructive">
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle>Cache Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Cache Size:</strong> {cacheStats.size}</p>
              <p><strong>Cache Keys:</strong></p>
              <div className="max-h-40 overflow-y-auto">
                {cacheStats.keys.map((key: string, index: number) => (
                  <div key={index} className="text-xs font-mono bg-gray-100 p-1 rounded">
                    {key}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {debugResult && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Player Info:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(debugResult.playerInfo, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold">Cache Key:</h4>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">{debugResult.cacheKey}</p>
              </div>

              <div>
                <h4 className="font-semibold">Cache Hit:</h4>
                <p className="text-sm">{debugResult.cacheHit ? "Yes" : "No"}</p>
              </div>

              <div>
                <h4 className="font-semibold">Result:</h4>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                  {debugResult.result || "No ESPN ID found"}
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Matches:</h4>
                <div className="space-y-2">
                  <div>
                    <strong>Exact Matches:</strong> {debugResult.matches.exact.length}
                    {debugResult.matches.exact.length > 0 && (
                      <div className="text-xs bg-gray-100 p-2 rounded mt-1">
                        {debugResult.matches.exact.map((match: any, index: number) => (
                          <div key={index}>
                            {match.fullName} (ID: {match.id}, Team: {match.teamAbbrev || match.team})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <strong>Partial Matches:</strong> {debugResult.matches.partial.length}
                  </div>
                  <div>
                    <strong>Name Matches:</strong> {debugResult.matches.name.length}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 