'use client'

import { Header } from '@/components/header'
import { useTeamBuilder } from '@/hooks/use-team-builder'
import { TierDistribution } from './TierDistribution'
import { TeamArchetypeCard } from './TeamArchetypeCard'

export function TeamBuilderView() {
  const { data, loading, error, refetch, getProbabilityColor, getRiskColor } = useTeamBuilder()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING TEAM BUILDER DATA...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">ERROR: {error || 'Failed to load data'}</p>
              <button
                onClick={refetch}
                className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono"
              >
                RETRY
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">TEAM BUILDER</h1>
          <p className="text-gray-400 font-mono">
            Explore different team construction strategies and their expected outcomes
          </p>
        </div>

        <TierDistribution tierDistribution={data.tierDistribution} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.teamArchetypes.map((archetype) => (
            <TeamArchetypeCard
              key={archetype.id}
              archetype={archetype}
              getProbabilityColor={getProbabilityColor}
              getRiskColor={getRiskColor}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
