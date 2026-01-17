import { Search } from 'lucide-react'
import { ProspectCard } from './ProspectCard'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { Prospect } from './types'

interface ProspectsTabProps {
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  positionFilter: string
  setPositionFilter: (filter: string) => void
  draftYear: string
  setDraftYear: (year: string) => void
  filteredProspects: Prospect[]
  allProspects: Prospect[]
  draftBoard: Prospect[]
  onProspectSelect: (prospect: Prospect) => void
  onShowComps: (prospect: Prospect) => void
  isDiamondTier: (prospect: Prospect) => boolean
  positionNeeds: Record<string, number>
}

export function ProspectsTab({
  loading,
  searchTerm,
  setSearchTerm,
  positionFilter,
  setPositionFilter,
  draftYear,
  setDraftYear,
  filteredProspects,
  allProspects,
  draftBoard,
  onProspectSelect,
  onShowComps,
  isDiamondTier,
  positionNeeds,
}: ProspectsTabProps) {
  return (
    <div className="relative">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 px-2">
          <div>
            <h2 className="text-3xl font-black text-white font-mono tracking-tighter uppercase mb-2">
              College <span className="text-blue-400">Prospects</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Comprehensive {draftYear === 'all' ? 'All-Time' : draftYear} rookie database and
              rankings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Search prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-slate-950/60 border-white/5 text-white w-full sm:w-64 focus:border-blue-500/30 focus:ring-0 font-mono text-xs rounded-xl transition-all"
              />
            </div>

            <Select value={draftYear} onValueChange={setDraftYear}>
              <SelectTrigger className="h-10 w-full sm:w-32 bg-slate-950/60 border-white/5 text-white focus:border-blue-500/30 focus:ring-0 font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white font-mono text-[10px]">
                <SelectItem value="all">ALL YEARS</SelectItem>
                <SelectItem value="2027">2027 CLASS</SelectItem>
                <SelectItem value="2026">2026 CLASS</SelectItem>
                <SelectItem value="2025">2025 CLASS</SelectItem>
                <SelectItem value="2024">2024 CLASS</SelectItem>
                <SelectItem value="2023">2023 CLASS</SelectItem>
                <SelectItem value="2022">2022 CLASS</SelectItem>
                <SelectItem value="2021">2021 CLASS</SelectItem>
                <SelectItem value="2020">2020 CLASS</SelectItem>
                <SelectItem value="2019">2019 CLASS</SelectItem>
              </SelectContent>
            </Select>

            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="h-10 w-full sm:w-36 bg-slate-950/60 border-white/5 text-white focus:border-blue-500/30 focus:ring-0 font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white font-mono text-[10px]">
                <SelectItem value="all">ALL ASSETS</SelectItem>
                <SelectItem value="QB">QUARTERBACKS</SelectItem>
                <SelectItem value="RB">RUNNING BACKS</SelectItem>
                <SelectItem value="WR">WIDE RECEIVERS</SelectItem>
                <SelectItem value="TE">TIGHT ENDS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">
            Accessing Secure Database...
          </p>
        </div>
      ) : (
        <div className="max-h-[1200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-10">
            {filteredProspects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                onSelect={onProspectSelect}
                onCompare={onShowComps}
                isOnBoard={draftBoard.some((p) => p.id === prospect.id)}
                variant="dossier"
                isDiamondTier={isDiamondTier(prospect)}
                positionNeed={positionNeeds[prospect.position] || 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
