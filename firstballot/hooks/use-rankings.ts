import { useState, useEffect, useMemo } from 'react'
import type {
  PlayerRanking,
  SortField,
  SortDirection,
  RankingsFilters,
  RankingsPagination,
  RankingsSort,
} from '@/types/rankings'

interface UseRankingsReturn {
  rankings: PlayerRanking[]
  loading: boolean
  filters: RankingsFilters & {
    setSearchTerm: (value: string) => void
    setPositionFilter: (value: string) => void
    setTierFilter: (value: string) => void
  }
  sort: RankingsSort & {
    setSortField: (field: SortField) => void
    setSortDirection: (direction: SortDirection) => void
    handleSort: (field: SortField) => void
  }
  pagination: RankingsPagination & {
    setCurrentPage: (page: number) => void
    setItemsPerPage: (items: number) => void
  }
  filteredAndSortedRankings: PlayerRanking[]
  paginatedRankings: PlayerRanking[]
  uniqueTiers: string[]
  extractTierNumber: (tier: string) => number
  isDiamondTier: (player: PlayerRanking) => boolean
  getRowBgColor: (player: PlayerRanking) => string
  getTierColor: (tier: string, isDiamond?: boolean) => string
  getTierDisplayName: (tier: string, isDiamond: boolean) => string
}

export function useRankings(): UseRankingsReturn {
  const [rankings, setRankings] = useState<PlayerRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/rankings')
        if (response.ok) {
          const data = await response.json()
          setRankings(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching rankings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [])

  const extractTierNumber = (tier: string): number => {
    const match = tier.match(/Tier (\d+)/)
    return match ? parseInt(match[1]) : 5
  }

  const filteredAndSortedRankings = useMemo(() => {
    let filtered = rankings.filter((player) => {
      const matchesSearch =
        searchTerm === '' || player.player_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPosition = positionFilter === 'all' || player.position === positionFilter
      const matchesTier = tierFilter === 'all' || player.tier === tierFilter
      return matchesSearch && matchesPosition && matchesTier
    })

    filtered.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortField) {
        case 'rank':
          aValue = a.rank
          bValue = b.rank
          break
        case 'total_score':
          aValue = a.total_score
          bValue = b.total_score
          break
        case 'age':
          aValue = a.age
          bValue = b.age
          break
        case 'player_name':
          aValue = a.player_name.toLowerCase()
          bValue = b.player_name.toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [rankings, searchTerm, positionFilter, tierFilter, sortField, sortDirection])

  const totalPages = Math.ceil(filteredAndSortedRankings.length / itemsPerPage)
  const paginatedRankings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedRankings.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedRankings, currentPage, itemsPerPage])

  const uniqueTiers = useMemo(() => {
    const tiers = new Set<string>()
    rankings.forEach((player) => {
      const tierNum = extractTierNumber(player.tier)
      tiers.add(tierNum.toString())
    })
    return Array.from(tiers).sort((a, b) => parseInt(a) - parseInt(b))
  }, [rankings])

  // Diamond tier logic: Top 3 players at each position
  const isDiamondTier = (player: PlayerRanking): boolean => {
    const positionPlayers = rankings.filter((p) => p.position === player.position)
    const sortedByRank = positionPlayers.sort((a, b) => a.rank - b.rank)
    const topThree = sortedByRank.slice(0, 3)
    return topThree.some((p) => p.rank === player.rank)
  }

  const getRowBgColor = (player: PlayerRanking): string => {
    if (isDiamondTier(player)) {
      return 'bg-cyan-950/30 border-l-4 border-l-cyan-400/80'
    }

    const tierNum = extractTierNumber(player.tier)
    const colors: Record<number, string> = {
      1: 'bg-yellow-900/20 border-l-4 border-l-yellow-500/80',
      2: 'bg-purple-950/15 border-l-4 border-l-purple-500/60',
      3: 'bg-blue-950/15 border-l-4 border-l-blue-500/60',
      4: 'bg-green-950/15 border-l-4 border-l-green-500/60',
      5: 'bg-orange-950/15 border-l-4 border-l-orange-500/60',
      6: 'bg-slate-800/10',
      7: 'bg-gray-800/10',
      8: 'bg-red-950/10',
    }
    return colors[tierNum] || ''
  }

  const getTierColor = (tier: string, isDiamond: boolean = false): string => {
    if (isDiamond) {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
    }

    const tierNum = extractTierNumber(tier)
    const colors: Record<number, string> = {
      1: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50',
      2: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
      3: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
      4: 'bg-green-500/20 text-green-300 border-green-400/50',
      5: 'bg-orange-500/20 text-orange-300 border-orange-400/50',
    }
    return colors[tierNum] || 'bg-gray-500/20 text-gray-300 border-gray-400/50'
  }

  const getTierDisplayName = (tier: string, isDiamond: boolean): string => {
    if (isDiamond) return 'Diamond Tier'
    if (tier.includes('Elite')) return 'Elite (Tier 1)'
    return tier
  }

  // getTierIcon moved to components/rankings/tierUtils.tsx since hooks can't return JSX

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, positionFilter, tierFilter])

  return {
    rankings,
    loading,
    filters: {
      searchTerm,
      positionFilter,
      tierFilter,
      setSearchTerm,
      setPositionFilter,
      setTierFilter,
    },
    sort: {
      field: sortField,
      direction: sortDirection,
      setSortField,
      setSortDirection,
      handleSort,
    },
    pagination: {
      currentPage,
      itemsPerPage,
      totalPages,
      setCurrentPage,
      setItemsPerPage,
    },
    filteredAndSortedRankings,
    paginatedRankings,
    uniqueTiers,
    extractTierNumber,
    isDiamondTier,
    getRowBgColor,
    getTierColor,
    getTierDisplayName,
  }
}
