# Code Standards & Ground Rules

This document outlines the ground rules and standards for maintaining code quality, structure, and consistency across the FirstBallot Fantasy codebase.

## Table of Contents

1. [File Structure](#file-structure)
2. [Component Architecture](#component-architecture)
3. [File Size Limits](#file-size-limits)
4. [Type Safety](#type-safety)
5. [Pre-commit Checklist](#pre-commit-checklist)
6. [Planning Before Implementation](#planning-before-implementation)
7. [Code Organization](#code-organization)
8. [Best Practices](#best-practices)

---

## File Structure

### Directory Organization

Maintain a clear, hierarchical file structure:

```
firstballot/
├── app/                    # Next.js app router pages
│   ├── [route]/
│   │   └── page.tsx       # Page components (parent components only)
│   └── api/               # API routes
├── components/             # Reusable components
│   ├── [feature]/         # Feature-specific components
│   │   ├── [Component].tsx
│   │   ├── types.ts       # Feature-specific types
│   │   └── index.ts       # Barrel exports
│   └── ui/                # Generic UI components
├── lib/                    # Utility functions and helpers
├── types/                  # Shared type definitions
└── hooks/                  # Custom React hooks
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `PlayerCard.tsx`, `RankingsTable.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`, `calculateScore.ts`)
- **Types**: camelCase with `.ts` extension (e.g., `types.ts`, `league.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `usePlayerData.ts`, `useDebounce.ts`)

---

## Component Architecture

### Parent-Child Component Pattern

**Pages should be minimal (20-30 lines) and serve a single main component that houses all sub-components.**

#### ✅ Good Example

```tsx
// app/rankings/page.tsx (Page - 20-30 lines)
'use client'

import { RankingsView } from '@/components/rankings/RankingsView'

export default function RankingsPage() {
  return <RankingsView />
}
```

```tsx
// components/rankings/RankingsView.tsx (Main Component - houses all sub-components)
'use client'

import { Header } from '@/components/header'
import { RankingsFilters } from '@/components/rankings/RankingsFilters'
import { RankingsTable } from '@/components/rankings/RankingsTable'
import { RankingsPagination } from '@/components/rankings/RankingsPagination'
import { useRankingsData } from '@/hooks/useRankingsData'

export function RankingsView() {
  const { rankings, filters, pagination } = useRankingsData()

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="w-full px-4 py-8">
        <RankingsFilters {...filters} />
        <RankingsTable data={rankings} />
        <RankingsPagination {...pagination} />
      </main>
    </div>
  )
}
```

#### ❌ Bad Example

```tsx
// app/rankings/page.tsx (Monolithic - 500+ lines)
'use client'

export default function RankingsPage() {
  // 500+ lines of state, logic, JSX all in one file
  // Filters, table, pagination all inline
}
```

#### ❌ Also Bad Example

```tsx
// app/rankings/page.tsx (Too much logic - should be 20-30 lines)
'use client'

import { Header } from '@/components/header'
import { RankingsFilters } from '@/components/rankings/RankingsFilters'
import { RankingsTable } from '@/components/rankings/RankingsTable'
import { RankingsPagination } from '@/components/rankings/RankingsPagination'
import { useRankingsData } from '@/hooks/useRankingsData'

export default function RankingsPage() {
  const { rankings, filters, pagination } = useRankingsData()

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="w-full px-4 py-8">
        <RankingsFilters {...filters} />
        <RankingsTable data={rankings} />
        <RankingsPagination {...pagination} />
      </main>
    </div>
  )
}
```

### Component Responsibilities

- **Page Components (`app/**/page.tsx`)\*\*:
  - **Must be 20-30 lines maximum**
  - Serve a single main component
  - No logic, no state, no hooks
  - Just import and render the main feature component
  - Example: `return <RankingsView />`

- **Main Feature Components (`components/[feature]/[Feature]View.tsx`)**:
  - Houses all sub-components for a feature
  - Orchestrates data fetching (via hooks)
  - Composes child components
  - Handles high-level layout
  - **Should be 100-400 lines maximum**

- **Feature Components (`components/[feature]/`)**:
  - Encapsulate specific functionality
  - Manage their own local state
  - Accept props for configuration
  - **Should be 100-300 lines maximum**

- **UI Components (`components/ui/`)**:
  - Generic, reusable components
  - No business logic
  - Highly composable
  - **Should be 50-200 lines maximum**

- **Feature Components (`components/[feature]/`)**:
  - Encapsulate specific functionality
  - Manage their own local state
  - Accept props for configuration
  - **Should be 100-300 lines maximum**

- **UI Components (`components/ui/`)**:
  - Generic, reusable components
  - No business logic
  - Highly composable
  - **Should be 50-200 lines maximum**

---

## File Size Limits

### Hard Limits

- **Page Components (`app/**/page.tsx`)**: **20-30 lines maximum\*\*
- **Maximum file size: 700 lines**
- **Target file size: 400-600 lines**
- **Ideal file size: 200-400 lines**

### Page Component Size Enforcement

**Page components MUST be 20-30 lines.** If a page exceeds 30 lines:

1. **Extract to main feature component**: Create `components/[feature]/[Feature]View.tsx`
2. **Move all logic**: State, hooks, and JSX go into the main feature component
3. **Page becomes a wrapper**: Page should only import and render the main component

**Note**: Existing pages may not yet follow this pattern. They should be refactored to comply with this standard. New pages MUST follow this pattern from the start.

### When to Refactor

If a file exceeds 600 lines, **immediately** refactor by:

1. **Extracting components**: Break down large components into smaller, focused components
2. **Extracting hooks**: Move complex logic into custom hooks
3. **Extracting utilities**: Move helper functions to `lib/` directory
4. **Splitting types**: Move type definitions to separate `types.ts` files

### Refactoring Checklist

- [ ] Identify distinct responsibilities within the file
- [ ] Extract each responsibility into its own component/hook/utility
- [ ] Update imports and exports
- [ ] Verify functionality remains intact
- [ ] Run format and type-check
- [ ] Update tests if applicable

---

## Type Safety

### Unified Type References

**All types must be defined in centralized locations and imported, never defined inline.**

#### ✅ Good Example

```tsx
// types/rankings.ts
export interface PlayerRanking {
  rank: number
  player_name: string
  position: string
  team: string
  age: number
  total_score: number
  tier: string
}

export type SortField = 'rank' | 'total_score' | 'age' | 'player_name'
export type SortDirection = 'asc' | 'desc'

// components/rankings/RankingsTable.tsx
import type { PlayerRanking } from '@/types/rankings'

interface RankingsTableProps {
  data: PlayerRanking[]
}
```

#### ❌ Bad Example

```tsx
// components/rankings/RankingsTable.tsx
interface PlayerRanking {
  // ❌ Inline type definition
  rank: number
  // ...
}
```

### Type Organization

1. **Shared Types** (`types/` directory):
   - Types used across multiple features
   - API response types
   - Domain models

2. **Feature Types** (`components/[feature]/types.ts`):
   - Types specific to a feature
   - Component prop types
   - Feature-specific interfaces

3. **Component Types** (inline only if truly local):
   - Only for types used in a single component
   - Prefer extracting to `types.ts` if reused

### Prohibiting `any` Type

**Never use `any` unless absolutely necessary and explicitly documented.**

#### ✅ Good Example

```tsx
// Use proper types
const handleSort = (field: SortField) => {
  // ...
}

// Use generics for flexible types
function processData<T>(data: T[]): T[] {
  return data.map((item) => transform(item))
}

// Use union types
type Status = 'loading' | 'success' | 'error'
```

#### ❌ Bad Example

```tsx
// ❌ Never do this
const handleSort = (field: any) => {
  // ...
}

// ❌ Avoid this
function processData(data: any[]): any[] {
  return data
}

// ❌ If you must use any, document why
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData: any = await fetchLegacyAPI()
```

### Allowed Exceptions for `any`

If `any` is absolutely necessary, you **must**:

1. Add a comment explaining why `any` is required
2. Use `eslint-disable-next-line @typescript-eslint/no-explicit-any`
3. Consider using `unknown` and type guards instead
4. Document the limitation in code comments

```tsx
// Example: Third-party library with no types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyLibrary: any = require('legacy-library-without-types')

// Example: Dynamic data where type is truly unknown
const handleDynamicData = (data: unknown): void => {
  if (typeof data === 'object' && data !== null) {
    // Type guard to narrow type
    const obj = data as Record<string, unknown>
    // Process safely
  }
}
```

---

## Pre-commit Checklist

**Before committing any code, you MUST:**

### 1. Run Formatting

```bash
npm run format
# or
pnpm format
# or
bun run format
```

This runs Prettier and ensures consistent code formatting.

### 2. Run Type Checking

```bash
npm run type-check
# or
pnpm type-check
# or
bun run type-check
```

This runs TypeScript compiler in check mode without emitting files.

### 3. Verify No Linter Errors

```bash
npm run lint
# or
pnpm lint
# or
bun run lint
```

### 4. Complete Checklist

- [ ] Code formatted with Prettier
- [ ] TypeScript type-check passes with no errors
- [ ] Linter passes with no errors
- [ ] File sizes are within limits (≤700 lines)
- [ ] No `any` types (or properly documented exceptions)
- [ ] Types are imported from centralized locations
- [ ] Components follow parent-child pattern
- [ ] Imports are organized and unused imports removed

---

## Planning Before Implementation

### Required Planning Steps

**Before writing any code, you MUST:**

1. **Understand the Requirements**
   - What is the feature supposed to do?
   - What are the edge cases?
   - What are the constraints?

2. **Design the Component Structure**
   - Page component (20-30 lines wrapper)
   - Main feature component (`[Feature]View.tsx`) that houses all sub-components
   - Identify child components within the main feature component
   - Determine data flow and state management
   - Plan prop interfaces and type definitions

3. **Plan the File Structure**
   - Where will new files be created?
   - What types need to be defined and where?
   - What utilities or hooks are needed?

4. **Estimate File Sizes**
   - Page component must be 20-30 lines (wrapper only)
   - Will main feature component exceed 400 lines?
   - Will any file exceed 600 lines?
   - How can components be broken down?
   - What can be extracted into hooks or utilities?

5. **Identify Dependencies**
   - What existing components can be reused?
   - What types already exist?
   - What APIs need to be called?

### Planning Template

```markdown
## Feature: [Feature Name]

### Requirements

- [ ] Requirement 1
- [ ] Requirement 2

### Component Structure

- Page: `app/[route]/page.tsx` (20-30 lines - wrapper only)
  - Main Component: `components/[feature]/[Feature]View.tsx` (houses all sub-components)
    - Child: `components/[feature]/ComponentA.tsx`
    - Child: `components/[feature]/ComponentB.tsx`
  - Hook: `hooks/useFeatureData.ts`

### Type Definitions

- Shared: `types/[feature].ts`
- Feature: `components/[feature]/types.ts`

### File Size Estimates

- `page.tsx`: ~20-30 lines (wrapper only)
- `[Feature]View.tsx`: ~200-300 lines (main component)
- `ComponentA.tsx`: ~150 lines
- `ComponentB.tsx`: ~150 lines
- `useFeatureData.ts`: ~100 lines

### Dependencies

- Existing: `components/ui/Button`, `components/ui/Card`
- New: None
```

---

## Code Organization

### Import Organization

Organize imports in this order:

1. **React and Next.js**
2. **Third-party libraries**
3. **Internal components** (`@/components`)
4. **Internal utilities** (`@/lib`)
5. **Internal hooks** (`@/hooks`)
6. **Internal types** (`@/types`)
7. **Relative imports** (`.`, `..`)

```tsx
// ✅ Good import organization
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Header } from '@/components/header'

import { formatDate } from '@/lib/utils'
import { usePlayerData } from '@/hooks/usePlayerData'

import type { PlayerRanking } from '@/types/rankings'

import { LocalComponent } from './LocalComponent'
```

### Export Patterns

**Use named exports for components and utilities:**

```tsx
// ✅ Good
export function RankingsTable({ data }: RankingsTableProps) {
  // ...
}

export const formatPlayerName = (name: string): string => {
  // ...
}
```

**Use default exports only for page components:**

```tsx
// ✅ Good - Page components
export default function RankingsPage() {
  // ...
}

// ✅ Good - Feature components
export function RankingsTable() {
  // ...
}
```

### Barrel Exports

Use `index.ts` files for clean imports:

```tsx
// components/rankings/index.ts
export { RankingsTable } from './RankingsTable'
export { RankingsFilters } from './RankingsFilters'
export { RankingsPagination } from './RankingsPagination'
export type * from './types'
```

---

## Best Practices

### 1. Component Composition

Prefer composition over large, monolithic components:

```tsx
// ✅ Good - Composed
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <ContentComponent />
  </CardContent>
</Card>

// ❌ Bad - Monolithic
<div className="card">
  <div className="card-header">
    {/* 200 lines of inline JSX */}
  </div>
</div>
```

### 2. Custom Hooks for Logic

Extract complex logic into custom hooks:

```tsx
// ✅ Good
const { rankings, loading, error } = useRankingsData()

// ❌ Bad - Logic in component
const [rankings, setRankings] = useState([])
useEffect(() => {
  // 50 lines of fetch logic
}, [])
```

### 3. Type Guards

Use type guards instead of `any`:

```tsx
// ✅ Good
function isPlayerRanking(obj: unknown): obj is PlayerRanking {
  return typeof obj === 'object' && obj !== null && 'rank' in obj && 'player_name' in obj
}

// ❌ Bad
const data: any = await fetchData()
```

### 4. Consistent Error Handling

Handle errors consistently:

```tsx
// ✅ Good
try {
  const data = await fetchData()
  return { data, error: null }
} catch (error) {
  console.error('Failed to fetch data:', error)
  return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
}
```

### 5. Meaningful Variable Names

Use descriptive names:

```tsx
// ✅ Good
const filteredRankings = rankings.filter(/* ... */)
const topThreePlayers = getTopPlayers(rankings, 3)

// ❌ Bad
const data = rankings.filter(/* ... */)
const top3 = getTop(rankings, 3)
```

---

## Enforcement

### Automated Checks

These standards should be enforced through:

1. **Pre-commit hooks** (recommended)
2. **CI/CD pipeline checks**
3. **Code review process**

### Code Review Checklist

When reviewing code, check:

- [ ] Page components are 20-30 lines maximum
- [ ] Page components serve a single main feature component
- [ ] File sizes are within limits (pages: 20-30, others: ≤700)
- [ ] No `any` types (or properly documented)
- [ ] Types are imported from centralized locations
- [ ] Components follow parent-child pattern
- [ ] Format and type-check have been run
- [ ] Planning was done before implementation

---

## Summary

### Quick Reference

1. **File Structure**: Organized, hierarchical, clear separation of concerns
2. **Component Architecture**: Pages are 20-30 line wrappers that serve a single main feature component
3. **File Size**: Pages 20-30 lines max, other files maximum 700 lines, target 400-600 lines
4. **Type Safety**: Centralized types, no `any` without documentation
5. **Pre-commit**: Always run `format` and `type-check`
6. **Planning**: Always plan before implementing

### Remember

> **"Fix things at the cause, not the symptom."**

When you encounter issues:

- Don't add quick fixes
- Understand the root cause
- Refactor properly
- Maintain code quality standards

---

## Questions or Issues?

If you're unsure about any standard or encounter a situation not covered here:

1. **Check existing code** for similar patterns
2. **Ask the team** for clarification
3. **Document the decision** if creating a new pattern
4. **Update this guide** if the pattern becomes standard

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0
