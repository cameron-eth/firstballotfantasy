'use client'

import Image from 'next/image'
import { useState, type PointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { ArrowUpRight, Star } from 'lucide-react'
import { COLLEGE_LOGOS } from '@/lib/college-logos'

export type CardProspect = {
  id: number
  name: string
  position: string
  school: string
  draft_year: number | null
  overall_grade: number | null
  college_production_score: number | null
  draft_projection_score: number | null
  headshot_url?: string | null
}

import { positionPalette, neutralPalette } from '@/lib/player-card-palette'

/** One portrait treatment for the hero, watchlist, and upcoming classes. */
export function ProspectTradingCard({ player, priority = false }: { player: CardProspect; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const logo = COLLEGE_LOGOS[player.school]
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const tiltX = useSpring(useTransform(y, [-0.5, 0.5], [7, -7]), { stiffness: 180, damping: 22 })
  const tiltY = useSpring(useTransform(x, [-0.5, 0.5], [-7, 7]), { stiffness: 180, damping: 22 })
  const color = positionPalette[player.position] ?? neutralPalette
  function move(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - bounds.left) / bounds.width - 0.5)
    y.set((event.clientY - bounds.top) / bounds.height - 0.5)
  }
  return <motion.div onPointerMove={move} onPointerLeave={() => { x.set(0); y.set(0) }} style={{ rotateX: reduced ? 0 : tiltX, rotateY: reduced ? 0 : tiltY, background: `linear-gradient(155deg, ${color.wash}, #10141e 70%)` }} className="group/card relative isolate flex aspect-[3/4] w-full flex-col overflow-hidden rounded-[20px] border border-white/20 shadow-[0_24px_60px_-20px_#000]">
    <div aria-hidden="true" className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(ellipse at 60% 35%, ${color.glow}99, transparent 65%)` }} />
    <div aria-hidden="true" className="absolute inset-2 rounded-[14px] border border-white/10" />
    {logo && failedLogo !== logo && <div aria-hidden="true" className="pointer-events-none absolute right-[6%] top-[14%] aspect-square w-[28%] max-w-[104px] opacity-40"><Image src={logo} alt="" fill sizes="104px" className="object-contain" onError={() => setFailedLogo(logo)} /></div>}
    <div className="relative z-20 flex items-center justify-between px-5 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em]"><span className="flex items-center gap-1.5" style={{ color: color.ink }}><Star className="h-3 w-3" /> First Ballot</span><span className="flex items-center gap-2 text-white/65">{player.draft_year}<span className="rounded border px-1.5 py-0.5" style={{ color: color.ink, borderColor: `${color.ink}55`, backgroundColor: `${color.ink}15` }}>{player.position}</span></span></div>
    {player.headshot_url && !failed ? <Image key={player.headshot_url} src={player.headshot_url} alt={player.name} fill sizes={priority ? '(max-width: 640px) 80vw, 420px' : '(max-width: 640px) 90vw, 360px'} priority={priority} onError={() => setFailed(true)} className={`!top-[9%] !h-[72%] ${player.headshot_url.includes('espncdn.com') ? 'object-cover' : 'object-contain'} object-top drop-shadow-[0_12px_20px_rgba(0,0,0,0.4)] transition-transform duration-700 motion-safe:group-hover/card:scale-[1.04]`} /> : <div className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-white/20">{player.name.split(' ').map(word => word[0]).slice(0, 2).join('')}</div>}
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#090e18] via-transparent to-transparent" />
    <div className="relative z-20 mt-auto px-5 pb-5 pt-16 bg-gradient-to-t from-[#090e18] via-[#090e18]/95 to-transparent">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: color.ink }}>{player.school} · {player.position}</p>
      <h3 className="text-[clamp(1.3rem,2.3vw,2rem)] font-bold leading-[1.08] tracking-[-0.04em]">{player.name}</h3>
      <div className="mt-4 flex items-end justify-between border-t border-white/15 pt-3"><div><p className="text-[9px] uppercase tracking-[0.17em] text-white/45">Scouting grade</p><p className="mt-1 text-3xl font-semibold leading-none tracking-tight" style={{ color: color.ink }}>{player.overall_grade == null ? 'Watchlist' : player.overall_grade.toFixed(1)}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition group-hover/card:border-white/60 group-hover/card:text-white"><ArrowUpRight className="h-4 w-4" /></span></div>
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute -inset-x-full inset-y-0 z-30 -translate-x-1/2 rotate-[25deg] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-1000 motion-safe:group-hover/card:translate-x-1/2 group-hover/card:opacity-100" />
  </motion.div>
}
