'use client'

import { cn } from '@/lib/utils'

export function PlayerCardSkeleton() {
  return (
    <div className="relative bg-card rounded-lg overflow-hidden border border-border animate-pulse">
      {/* Rank Badge Skeleton */}
      <div className="absolute top-3 left-3 z-10">
        <div className="h-10 w-8 bg-secondary rounded" />
      </div>

      {/* Tier Badge Skeleton */}
      <div className="absolute top-3 right-3 z-10">
        <div className="h-5 w-16 bg-secondary rounded" />
      </div>

      {/* Player Image Skeleton */}
      <div className="relative h-48 bg-secondary/50 flex items-end justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-[1]" />
        <div className="w-32 h-32 bg-secondary rounded-full mb-4" />
      </div>

      {/* Player Info Skeleton */}
      <div className="p-4">
        <div className="h-6 w-3/4 bg-secondary rounded mb-2" />
        <div className="h-4 w-1/2 bg-secondary rounded mb-4" />

        {/* Grade Skeleton */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="h-8 w-20 bg-secondary rounded" />
          </div>
          <div className="h-6 w-16 bg-secondary rounded" />
        </div>

        {/* Stats Bars Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-secondary rounded" />
            <div className="flex-1 h-1.5 bg-secondary rounded-full" />
            <div className="h-3 w-6 bg-secondary rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-secondary rounded" />
            <div className="flex-1 h-1.5 bg-secondary rounded-full" />
            <div className="h-3 w-6 bg-secondary rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PlayerCardSkeleton key={i} />
      ))}
    </div>
  )
}
