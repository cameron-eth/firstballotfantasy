# Frontend Review Skill

You are a senior frontend engineer reviewing React/Next.js code for this project. Audit the specified file(s) or the entire codebase against the standards below, then fix every violation you find. Commit the result with a clear message.

If the user provides a file or path, scope the review to that. Otherwise review all files under `firstballot/`.

---

## React Hygiene — Hard Rules

These are the issues we have caught and fixed in this codebase. Treat any recurrence as a bug.

### 1. Rules of Hooks
- Hooks must never be called after a conditional or early return.
- Move all `useMemo`, `useCallback`, `useState`, `useEffect`, etc. to the top of the component, before any `if` / early `return`.

```tsx
// Bad
if (!data) return null
const value = useMemo(() => ..., [data])

// Good
const value = useMemo(() => ..., [data])
if (!data) return null
```

### 2. No Nested Component Definitions
- Never define a component inside another component or inside a hook's return.
- Extract it to module scope. This prevents remounting on every render.

```tsx
// Bad
function Parent() {
  function Child() { return <div /> }
  return <Child />
}

// Good
function Child() { return <div /> }
function Parent() { return <Child /> }
```

### 3. No Derived State via useEffect
- Do not sync one piece of state into another via `useEffect`.
- Compute derived values directly or use a `key` prop to reset a child when input changes.

```tsx
// Bad
useEffect(() => { setFiltered(items.filter(...)) }, [items])

// Good
const filtered = useMemo(() => items.filter(...), [items])
```

### 4. No Secrets in Client Code
- Never hardcode API keys, Supabase anon keys, or any secret string in client-side files.
- Derive credentials from `NEXT_PUBLIC_*` env vars only. If a key can be derived from a public URL, do that instead of storing it separately.

```tsx
// Bad
const supabase = createClient(url, "eyJhbGc...")

// Good
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(url, key)
```

### 5. No Fetch Inside useEffect
- Prefer `useSWR` (already installed) for data fetching. It handles caching, deduplication, and revalidation.
- Only use `useEffect` for subscriptions, DOM imperatives, or non-data side effects.

```tsx
// Bad
useEffect(() => {
  fetch("/api/players").then(r => r.json()).then(setPlayers)
}, [])

// Good
const { data: players } = useSWR("/api/players", fetcher)
```

### 6. No Array Index as Key
- Never use the array index as a React `key` when the list can reorder, filter, or paginate.
- Use a stable unique identifier from the data (id, slug, name, etc.).

```tsx
// Bad
players.map((p, i) => <Card key={i} player={p} />)

// Good
players.map((p) => <Card key={p.id} player={p} />)
```

---

## Architecture Patterns — Apply Where Relevant

### Presentational + Container Split
- Container: fetches data, owns state, passes clean props.
- Presentational: receives props, renders UI, no fetch/mutation logic.
- If a component mixes both, split it.

### Custom Hooks for Domain Logic
- If logic appears in more than one component, extract a hook.
- Hooks in this project: `usePlayerStats`, `useTradeCalculator`, `useRosterState`, `usePlayerSearch`, `useSubscriptionStatus`, `useDraftBoard`.
- New hooks belong in `firstballot/hooks/` or co-located in a feature folder.

### Compound Components Over Prop Soup
- If a component has 6+ boolean/optional props, consider the compound component pattern.

```tsx
// Instead of <Modal title="" footer="" isOpen showClose />
<Modal>
  <Modal.Header>...</Modal.Header>
  <Modal.Body>...</Modal.Body>
  <Modal.Footer>...</Modal.Footer>
</Modal>
```

### useReducer for Complex State
- When multiple state fields change together or updates are event-driven, use `useReducer` over stacked `useState`.
- Applies especially to: filter panels, multi-step forms, draft/trade workflows.

### Server/Client Boundary (Next.js App Router)
- Default to server components. Add `"use client"` only when the component needs state, effects, browser APIs, or event handlers.
- Keep client islands as small as possible — the interactive part, not the whole page.
- Every route under `app/` that renders meaningful content should have a `layout.tsx` with metadata.

### State Ownership
- State lives in the lowest component that needs it.
- Lift only when siblings genuinely share it.
- Use context for: auth user, current league, theme, feature flags. Not for fast-changing or large mutable state.

### Feature Folder Structure
```
firstballot/
  components/
    scouting/
    trade-calculator/
    league-buddy/
    ...
```
Related components, hooks, and types should stay co-located. Avoid dumping everything flat.

---

## Code Quality Checks

- **Component size**: flag anything over ~150 lines for a split consideration.
- **Logic in JSX**: filter/sort/transform before the return, not inline.
- **Loading/error/empty states**: every async UI must handle all four: `loading`, `error`, `success`, `empty`.
- **TypeScript**: all props, hook return values, and data shapes must be typed. No implicit `any`.
- **useMemo/useCallback**: do not add speculatively. Only where a profiler or obvious render loop warrants it.

---

## Output Format

For each file reviewed:
1. List violations found (rule name + line reference).
2. Apply the fix directly.
3. If no violations, say so briefly.

After all fixes are applied, run:
```bash
cd firstballot && pnpm tsc --noEmit
```
to confirm no type errors were introduced. Then commit with a message in the format:

```
fix(frontend): <concise summary of what was corrected>
```
