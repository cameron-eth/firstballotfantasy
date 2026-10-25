'use client'
import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { COLLEGE_LOGOS } from '@/lib/college-logos'
import { positionPalette, neutralPalette } from '@/lib/player-card-palette'

export function StrategyCard({
  name,
  position,
  team,
  image,
  label,
  action,
  onAction,
  outgoing = false,
  rookie = false,
  disabled = false,
}: {
  name: string
  position: string
  team: string
  image?: string | null
  label: string
  action: string
  onAction: () => void
  outgoing?: boolean
  rookie?: boolean
  disabled?: boolean
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const color = positionPalette[position] ?? neutralPalette
  const identity = team.split(' · ')[0]
  const logo =
    COLLEGE_LOGOS[identity] ??
    (/^[A-Z]{2,3}$/.test(identity)
      ? `https://a.espncdn.com/i/teamlogos/nfl/500/${identity.toLowerCase()}.png`
      : null)
  return (
    <article
      className={`group/card relative isolate flex min-h-[350px] flex-col overflow-hidden rounded-[20px] border shadow-[0_16px_40px_-20px_#000] transition duration-300 motion-safe:hover:-translate-y-1 ${rookie ? 'border-lime-300 ring-1 ring-lime-300/60' : outgoing ? 'border-orange-300/40' : 'border-white/20 hover:border-white/40'} ${outgoing ? 'saturate-50' : ''}`}
      style={{ background: `linear-gradient(155deg, ${color.wash}, #10141e 70%)` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(ellipse at 60% 30%, ${color.glow}99, transparent 65%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 rounded-[14px] border border-white/10"
      />
      <span
        className="absolute left-4 top-4 z-20 rounded border px-2 py-1 text-[10px] font-semibold"
        style={{ color: color.ink, borderColor: `${color.ink}55`, backgroundColor: color.wash }}
      >
        {position}
        {rookie && <span className="ml-2 border-l border-white/20 pl-2 text-lime-300">Rookie</span>}
      </span>
      <div className="relative h-48 shrink-0">
        {logo && failedLogo !== logo && (
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            onError={() => setFailedLogo(logo)}
            className="pointer-events-none absolute right-5 top-3 h-16 w-16 object-contain opacity-40"
          />
        )}
        {image && failedImage !== image ? (
          <img
            src={image}
            alt=""
            onError={() => setFailedImage(image)}
            className="absolute inset-0 h-full w-full object-contain object-bottom px-3 pt-2 drop-shadow-[0_12px_20px_rgba(0,0,0,0.4)] transition-transform duration-700 motion-safe:group-hover/card:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Photo unavailable
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#090e18] to-transparent"
        />
      </div>
      <div className="relative z-20 flex flex-1 flex-col bg-[#090e18] px-4 pb-4">
        <p
          className="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: color.ink }}
        >
          {identity}
        </p>
        <h3 className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-white">
          {name}
        </h3>
        {team.includes(' · ') && (
          <p className="mt-1 break-words text-[11px] text-slate-400">
            {team.slice(team.indexOf(' · ') + 3)}
          </p>
        )}
        <div className="mt-auto pt-4">
          <p
            className={`mb-3 border-t border-white/15 pt-3 text-xs ${outgoing ? 'text-orange-300' : 'text-slate-400'}`}
          >
            {label}
          </p>
          <button
            onClick={onAction}
            disabled={disabled}
            aria-label={`${action} ${name}`}
            className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            style={{ color: color.ink, borderColor: `${color.ink}40` }}
          >
            {action}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  )
}
