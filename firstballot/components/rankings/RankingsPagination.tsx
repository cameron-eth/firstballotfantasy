'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RankingsPagination } from '@/types/rankings'

interface RankingsPaginationProps {
  pagination: RankingsPagination & {
    setCurrentPage: (page: number) => void
    setItemsPerPage: (items: number) => void
  }
  totalResults: number
}

export function RankingsPagination({ pagination, totalResults }: RankingsPaginationProps) {
  if (totalResults === 0) {
    return null
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Results Count - Full Width on Mobile */}
      <div className="text-sm text-slate-300 font-mono text-center sm:text-left">
        Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} -{' '}
        {Math.min(pagination.currentPage * pagination.itemsPerPage, totalResults)} of {totalResults}{' '}
        players
      </div>

      {/* Pagination Buttons - Stack on Mobile, Row on Desktop */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Page Info - Centered on Mobile */}
        <div className="text-sm text-white font-mono font-semibold sm:hidden">
          Page {pagination.currentPage} of {pagination.totalPages}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.setCurrentPage(1)}
            disabled={pagination.currentPage === 1}
            className="flex-1 sm:flex-none border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-yellow-400/50 !text-white disabled:!text-slate-500 disabled:border-slate-700 disabled:bg-slate-800/50 h-10 font-semibold font-mono"
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.setCurrentPage(Math.max(1, pagination.currentPage - 1))}
            disabled={pagination.currentPage === 1}
            className="flex-1 sm:flex-none border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-yellow-400/50 !text-white disabled:!text-slate-500 disabled:border-slate-700 disabled:bg-slate-800/50 h-10 font-semibold font-mono"
          >
            Prev
          </Button>

          {/* Page Info - Hidden on Mobile, Visible on Desktop */}
          <span className="hidden sm:inline text-sm text-white font-mono font-semibold px-4">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              pagination.setCurrentPage(Math.min(pagination.totalPages, pagination.currentPage + 1))
            }
            disabled={pagination.currentPage === pagination.totalPages}
            className="flex-1 sm:flex-none border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-yellow-400/50 !text-white disabled:!text-slate-500 disabled:border-slate-700 disabled:bg-slate-800/50 h-10 font-semibold font-mono"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.setCurrentPage(pagination.totalPages)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="flex-1 sm:flex-none border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-yellow-400/50 !text-white disabled:!text-slate-500 disabled:border-slate-700 disabled:bg-slate-800/50 h-10 font-semibold font-mono"
          >
            Last
          </Button>
        </div>
      </div>

      {/* Items Per Page Selector */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-gray-400 hidden sm:inline">Per page:</span>
        <Select
          value={pagination.itemsPerPage.toString()}
          onValueChange={(value) => {
            pagination.setItemsPerPage(parseInt(value))
            pagination.setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-20 sm:w-24 bg-slate-700 border-slate-600 text-white h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-white">
            <SelectItem value="25" className="text-white">
              25
            </SelectItem>
            <SelectItem value="50" className="text-white">
              50
            </SelectItem>
            <SelectItem value="100" className="text-white">
              100
            </SelectItem>
            <SelectItem value="200" className="text-white">
              200
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
