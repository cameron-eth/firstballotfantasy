"use client"

import { Header } from "@/components/header"
import { EspnIdDebugger } from "@/components/espn-id-debugger"
import { PlayerHeadshot } from "@/components/player-headshot"

export default function DebugEspnPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400 font-mono mb-4">ESPN ID Debugger</h1>
            <p className="text-slate-400 mb-6">
              Use this tool to debug ESPN ID resolution issues when switching teams/leagues.
              This helps identify why headshots might be mapped incorrectly.
            </p>
          </div>

          <EspnIdDebugger />

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-yellow-400 font-mono mb-4">Test Player Headshots</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Test some common players */}
              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-100 mb-2">Josh Allen (BUF QB)</h3>
                <PlayerHeadshot
                  playerName="Josh Allen"
                  teamLogo="BUF"
                  size={64}
                  player={{
                    playerName: "Josh Allen",
                    first_name: "Josh",
                    last_name: "Allen",
                    team: "BUF",
                    position: "QB"
                  }}
                />
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-100 mb-2">Patrick Mahomes (KC QB)</h3>
                <PlayerHeadshot
                  playerName="Patrick Mahomes"
                  teamLogo="KC"
                  size={64}
                  player={{
                    playerName: "Patrick Mahomes",
                    first_name: "Patrick",
                    last_name: "Mahomes",
                    team: "KC",
                    position: "QB"
                  }}
                />
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-100 mb-2">Justin Jefferson (MIN WR)</h3>
                <PlayerHeadshot
                  playerName="Justin Jefferson"
                  teamLogo="MIN"
                  size={64}
                  player={{
                    playerName: "Justin Jefferson",
                    first_name: "Justin",
                    last_name: "Jefferson",
                    team: "MIN",
                    position: "WR"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 