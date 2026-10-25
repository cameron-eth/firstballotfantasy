'use client'
import { Check, ChevronDown, Copy, LoaderCircle, Save } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CompactSelect } from '@/components/ui/compact-select'
import type { Scenario } from '@/lib/team-scenarios'
export function PlanMenu({
  scenarios,
  scenario,
  select,
  update,
  duplicate,
  save,
  busy,
  dirty,
  signedIn,
  message,
}: {
  scenarios: Scenario[]
  scenario: Scenario
  select: (id: string) => void
  update: (patch: Partial<Scenario>) => void
  duplicate: () => void
  save: () => void
  busy: boolean
  dirty: boolean
  signedIn: boolean
  message: string
}) {
  const field =
    'mt-1.5 w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400/60 disabled:opacity-50'
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex h-9 items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 text-xs font-medium text-slate-200 hover:bg-slate-800">
          <span>Plans</span>
          {busy ? (
            <LoaderCircle className="h-3 w-3 animate-spin" />
          ) : dirty ? (
            <span aria-label="Unsaved changes" className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          ) : null}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(340px,calc(100vw-32px))] space-y-4 rounded-xl border-slate-700/70 bg-slate-900 p-4 shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <CompactSelect
            label="Saved scenario"
            value={scenario.id}
            onChange={select}
            disabled={busy}
            className="min-w-0 flex-1"
            options={scenarios.map((s) => ({ value: s.id, label: s.name }))}
          />
          <button
            title="Duplicate plan"
            aria-label="Duplicate plan"
            disabled={busy || scenarios.length >= 12}
            onClick={duplicate}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-xs text-slate-400">
          Plan name
          <input
            disabled={busy}
            className={field}
            maxLength={80}
            value={scenario.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <label className="block text-xs text-slate-400">
          Notes
          <textarea
            disabled={busy}
            className={`${field} min-h-20 resize-y`}
            maxLength={2000}
            value={scenario.notes}
            placeholder="What are you building toward?"
            onChange={(e) => update({ notes: e.target.value })}
          />
        </label>
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
          <span role="status" className="text-[11px] text-slate-400">
            {busy
              ? 'Saving changes…'
              : !signedIn
                ? 'Sign in to save'
                : message || (dirty ? 'Unsaved changes' : 'No unsaved changes')}
          </span>
          <button
            disabled={!signedIn || busy || !dirty}
            onClick={save}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : dirty ? (
              <Save className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {busy ? 'Saving…' : dirty ? 'Save' : 'Up to date'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
