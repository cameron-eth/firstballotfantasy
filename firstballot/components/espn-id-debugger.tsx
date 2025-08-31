"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle } from "lucide-react"

export function EspnIdDebugger() {
  const [playerName, setPlayerName] = useState("")
  const [team, setTeam] = useState("")
  const [position, setPosition] = useState("")

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-yellow-400 font-mono flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>ESPN ID Debugger</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-300 text-sm">
          This component is a placeholder. ESPN ID debugging functionality will be implemented here.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Player Name</label>
            <Input
              placeholder="Enter player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Team</label>
            <Input
              placeholder="Enter team abbreviation"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Position</label>
            <Input
              placeholder="Enter position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
        </div>
        
        <Button 
          className="bg-yellow-400 text-slate-900 hover:bg-yellow-300"
          disabled
        >
          Debug ESPN ID (Coming Soon)
        </Button>
      </CardContent>
    </Card>
  )
} 