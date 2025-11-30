'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import type { PlayerSuggestion } from '@/types/trade-calculator'

interface TradeSideInputProps {
  side: string[]
  onChange: (items: string[]) => void
  placeholder: string
  sideLabel: string
}

export function TradeSideInput({ side, onChange, placeholder, sideLabel }: TradeSideInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(inputValue, 300)

  // Fetch player suggestions from API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearch.trim().length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      try {
        const response = await fetch(`/api/rankings?search=${encodeURIComponent(debouncedSearch)}`)
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.players || [])
          setShowSuggestions(true)
          setSelectedIndex(-1)
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        setSuggestions([])
      }
    }

    fetchSuggestions()
  }, [debouncedSearch])

  const handleAddItem = useCallback(
    (item?: string) => {
      const valueToAdd = item || inputValue.trim()
      if (valueToAdd && !side.includes(valueToAdd)) {
        onChange([...side, valueToAdd])
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
        handleAddItem(suggestions[selectedIndex].player_name)
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

  const handleSuggestionClick = (playerName: string) => {
    handleAddItem(playerName)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">{sideLabel}</h3>
        <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
          {side.length} {side.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      <div className="relative flex gap-2">
        <div className="flex-1 relative">
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
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            className="bg-slate-700/50 border-slate-600 text-white w-full focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 transition-all"
          />
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {suggestions.map((player, index) => (
                <div
                  key={`${player.player_name}-${index}`}
                  onClick={() => handleSuggestionClick(player.player_name)}
                  className={`px-4 py-2 cursor-pointer hover:bg-slate-700 transition-colors ${
                    index === selectedIndex ? 'bg-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{player.player_name}</span>
                      <Badge
                        variant="outline"
                        className="bg-slate-600/30 text-slate-300 border-slate-500/30 text-xs"
                      >
                        {player.position}
                      </Badge>
                      <span className="text-gray-400 text-sm">{player.team}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          onClick={() => handleAddItem()}
          size="sm"
          className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-900 font-semibold shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {side.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg border border-slate-600/50 hover:border-yellow-400/30 transition-all shadow-sm"
          >
            <span className="text-white text-sm font-mono">{item}</span>
            <Button
              onClick={() => handleRemoveItem(index)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
