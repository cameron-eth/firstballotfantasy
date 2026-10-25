'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
export function CompactSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-label={label}
        className={`h-9 w-auto min-w-32 gap-3 rounded-lg border-slate-700/60 bg-slate-800/60 text-xs text-slate-200 shadow-none focus:ring-blue-400/40 ${className}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="max-h-72 rounded-xl border-slate-700 bg-slate-900 p-1 text-slate-200 shadow-xl"
      >
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="rounded-md py-2 text-xs focus:bg-blue-400/15 focus:text-blue-200"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
