'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { X, Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import type { PlayerSuggestion } from '@/types/trade-calculator'

interface TradeSideInputProps {
  side: string[]
  onChange: (items: string[]) => void
  placeholder: string
  sideLabel: string
}

interface AssetMetadata {
  headshot_url?: string | null
  espn_id?: string | number | null
}

export function TradeSideInput({ side, onChange, placeholder, sideLabel }: TradeSideInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [assetMetadata, setAssetMetadata] = useState<Record<string, AssetMetadata>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const suggestionsRequestIdRef = useRef(0)
  const debouncedSearch = useDebounce(inputValue, 300)

  const fetchSuggestions = useCallback(async (query: string) => {
    const requestId = suggestionsRequestIdRef.current + 1
    suggestionsRequestIdRef.current = requestId

    try {
      const response = await fetch(`/api/rankings?search=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        if (requestId !== suggestionsRequestIdRef.current) return
        const nextSuggestions = data.players || []
        setSuggestions(nextSuggestions)
        setShowSuggestions(nextSuggestions.length > 0)
        setSelectedIndex(-1)
      } else {
        if (requestId !== suggestionsRequestIdRef.current) return
        setSuggestions([])
      }
    } catch (error) {
      if (requestId !== suggestionsRequestIdRef.current) return
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    }
  }, [])

  // Fetch player suggestions from API
  useEffect(() => {
    const query = debouncedSearch.trim()
    if (query.length < 1) {
      suggestionsRequestIdRef.current += 1
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    fetchSuggestions(query)
  }, [debouncedSearch, fetchSuggestions])

  const handleAddItem = useCallback(
    (item?: string, metadata?: AssetMetadata) => {
      const valueToAdd = item || inputValue.trim()
      if (valueToAdd && !side.includes(valueToAdd)) {
        onChange([...side, valueToAdd])
        if (metadata?.headshot_url || metadata?.espn_id) {
          setAssetMetadata((prev) => ({
            ...prev,
            [valueToAdd]: {
              headshot_url: metadata.headshot_url ?? null,
              espn_id: metadata.espn_id ?? null,
            },
          }))
        }
        setInputValue('')
        setSuggestions([])
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    },
    [inputValue, side, onChange]
  )

  const handleRemoveItem = (index: number) => {
    onChange(side.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        const selected = suggestions[selectedIndex]
        handleAddItem(selected.player_name, {
          headshot_url: selected.headshot_url,
          espn_id: selected.espn_id,
        })
      } else {
        handleAddItem()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const handleSuggestionClick = (suggestion: PlayerSuggestion) => {
    handleAddItem(suggestion.player_name, {
      headshot_url: suggestion.headshot_url,
      espn_id: suggestion.espn_id,
    })
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fill missing metadata for manually typed assets
  useEffect(() => {
    const unresolved = side.filter((item) => !assetMetadata[item])
    if (unresolved.length === 0) return

    let cancelled = false
    const hydrateMetadata = async () => {
      const lookups = await Promise.all(
        unresolved.map(async (name) => {
          try {
            const response = await fetch(`/api/rankings?player=${encodeURIComponent(name)}`)
            if (!response.ok) return null
            const data = await response.json()
            return {
              name,
              metadata: {
                headshot_url: data.headshot_url ?? null,
                espn_id: data.espn_id ?? null,
              },
            }
          } catch {
            return null
          }
        })
      )

      if (cancelled) return

      setAssetMetadata((prev) => {
        const merged = { ...prev }
        for (const entry of lookups) {
          if (!entry) continue
          merged[entry.name] = entry.metadata
        }
        return merged
      })
    }

    hydrateMetadata()
    return () => {
      cancelled = true
    }
  }, [side, assetMetadata])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black font-mono text-slate-400 uppercase tracking-[0.2em]">
          {sideLabel}
        </h3>
        <div className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-[9px] font-black font-mono text-slate-500 uppercase">
          {side.length} Asset{side.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="relative">
        <div className="relative group/input">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={handleKeyPress}
            onFocus={() => {
              if (inputValue.trim().length === 0) {
                fetchSuggestions('')
              } else if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            className="bg-slate-900/50 border-white/5 text-white w-full h-12 pl-4 pr-12 rounded-xl focus:border-blue-500/30 focus:ring-0 transition-all font-mono text-xs placeholder:text-slate-700"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              onClick={() => handleAddItem()}
              size="sm"
              className="h-8 w-8 p-0 bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 border border-white/5 rounded-lg transition-all"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-[60] w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-64 overflow-y-auto backdrop-blur-xl"
          >
            {suggestions.map((player, index) => (
              <div
                key={`${player.espn_id ?? 'unknown'}-${player.player_name}`}
                onClick={() => handleSuggestionClick(player)}
                className={`px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                  index === selectedIndex ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <PlayerHeadshot
                        headshotUrl={player.headshot_url}
                        espnId={player.espn_id}
                        playerName={player.player_name}
                        size={32}
                      />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-white font-mono uppercase">
                        {player.player_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                        {player.team} <span className="opacity-30">•</span> {player.position}
                      </div>
                    </div>
                  </div>
                  <Plus className="h-3 w-3 text-slate-700" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items list - Asset Tokens */}
      <div className="grid grid-cols-1 gap-2">
        {side.map((item, index) => (
          <div
            key={item}
            className="group flex items-center justify-between p-3 bg-slate-900/40 hover:bg-slate-900/60 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                <PlayerHeadshot
                  playerName={item}
                  headshotUrl={assetMetadata[item]?.headshot_url}
                  espnId={assetMetadata[item]?.espn_id}
                  size={32}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-200 font-mono uppercase tracking-tight group-hover:text-white transition-colors">
                  {item}
                </span>
                <span className="text-[9px] text-slate-600 font-mono uppercase">
                  Verified Asset
                </span>
              </div>
            </div>
            <button
              onClick={() => handleRemoveItem(index)}
              className="h-6 w-6 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {side.length === 0 && (
          <div className="py-10 border-2 border-dashed border-white/5 rounded-2xl flex flex-center justify-center">
            <span className="text-[10px] font-black font-mono text-slate-700 uppercase tracking-widest">
              Empty Asset Queue
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
