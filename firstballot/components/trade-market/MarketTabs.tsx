'use client'

import type { MarketTab } from './types'

interface MarketTabsProps {
  activeTab: MarketTab
  onTabChange: (tab: MarketTab) => void
}

/** The Market Overview / Market Trends switcher. */
export function MarketTabs({ activeTab, onTabChange }: MarketTabsProps) {
  return (
    <div className="bg-card/60 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-0">
          {([
            { key: 'overview' as MarketTab, label: 'Market Overview' },
            { key: 'trends' as MarketTab, label: 'Market Trends' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wide border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
                            </div>
      </div>
    </div>
  )
}
