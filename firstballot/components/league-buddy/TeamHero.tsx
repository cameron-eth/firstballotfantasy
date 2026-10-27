import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MetricTip } from './MetricTip'
import { PlayerFace } from './ui/PlayerFace'
import { Badge, gradeTone } from './ui/Badge'
import type { PlayerData } from './types'

type Stat = {
  label: string
  help: string
  value: ReactNode
  detail?: ReactNode
  accent: string
}

/**
 * The team at a glance: four numbers on the left, the faces that drive them on the right.
 * Faces are the roster's highest-value skill players, so the picture changes when the team does.
 */
export function TeamHero({
  stats,
  faces,
  grade,
}: {
  stats: Stat[]
  faces: PlayerData[]
  grade: string
}) {
  return (
    <section
      aria-label="Team snapshot"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/60"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#475569_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="text-[11px] text-slate-400">
                <MetricTip label={stat.label}>{stat.help}</MetricTip>
              </dt>
              <dd
                className={cn(
                  'mt-1 text-3xl font-semibold tabular-nums tracking-tight',
                  stat.accent
                )}
              >
                {stat.label === 'Roster grade' ? (
                  <span className="inline-flex items-center gap-2">
                    {stat.value}
                    {grade && grade !== '—' && (
                      <Badge tone={gradeTone(grade)}>{gradeWord(grade)}</Badge>
                    )}
                  </span>
                ) : (
                  stat.value
                )}
              </dd>
              {stat.detail && <dd className="mt-1 text-[11px] text-slate-500">{stat.detail}</dd>}
            </div>
          ))}
        </dl>
        {faces.length > 0 && (
          <div
            className="flex -space-x-4 self-end lg:self-center"
            aria-label="Your highest-value players"
          >
            {faces.slice(0, 5).map((player, index) => (
              <div
                key={player.playerId}
                title={`${player.playerName} · ${player.position}`}
                className="rounded-2xl ring-2 ring-slate-900"
                style={{ zIndex: 5 - index, transform: `translateY(${index % 2 ? 6 : 0}px)` }}
              >
                <PlayerFace player={player} size={index === 0 ? 84 : 72} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const gradeWord = (grade: string) =>
  /^A/.test(grade) ? 'Strong' : /^B/.test(grade) ? 'Solid' : /^C/.test(grade) ? 'Middling' : 'Weak'
