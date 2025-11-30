'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { ProspectCard } from './ProspectCard'
import type { Prospect } from './types'

interface ProspectsTabProps {
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  positionFilter: string
  setPositionFilter: (filter: string) => void
  schoolFilter: string
  setSchoolFilter: (filter: string) => void
  schools: string[]
  filteredProspects: Prospect[]
  draftBoard: Prospect[]
  onProspectSelect: (prospect: Prospect) => void
  onShowComps: (prospect: Prospect) => void
  isDiamondTier: (prospect: Prospect) => boolean
}

export function ProspectsTab({
  loading,
  searchTerm,
  setSearchTerm,
  positionFilter,
  setPositionFilter,
  schoolFilter,
  setSchoolFilter,
  schools,
  filteredProspects,
  draftBoard,
  onProspectSelect,
  onShowComps,
  isDiamondTier,
}: ProspectsTabProps) {
  return (
    <div className="relative">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-4">
          <h2 className="text-white text-xl font-semibold">College Prospects</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white w-full sm:w-auto"
              />
            </div>
            <div className="flex space-x-2">
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-full sm:w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  <SelectItem value="all" className="text-white">
                    All Positions
                  </SelectItem>
                  <SelectItem value="QB" className="text-white">
                    QB
                  </SelectItem>
                  <SelectItem value="RB" className="text-white">
                    RB
                  </SelectItem>
                  <SelectItem value="WR" className="text-white">
                    WR
                  </SelectItem>
                  <SelectItem value="TE" className="text-white">
                    TE
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="School" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  <SelectItem value="all" className="text-white">
                    All Schools
                  </SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school} value={school} className="text-white">
                      {school}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading prospects...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProspects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              onSelect={onProspectSelect}
              onCompare={onShowComps}
              isOnBoard={draftBoard.some((p) => p.id === prospect.id)}
              variant="full"
              isDiamondTier={isDiamondTier(prospect)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
