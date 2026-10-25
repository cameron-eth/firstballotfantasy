'use client'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import { type Player, getPlayerImageUrl } from '@/lib/players'
export function PlayerCard({ player }: { player: Player; index: number }) {
  return (
    <PlayerTradingCard
      name={player.name}
      position={player.position}
      team={player.school}
      image={getPlayerImageUrl(player)}
      badge={`${player.positionRank} · ${player.tier}`}
      label={`${player.year ?? 'Class TBD'} · ${player.isCollege ? 'Prospect' : 'Historical class'}`}
    >
      <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
        <span>Scouting grade</span>
        <strong className="text-lg text-white">
          {player.grade == null ? '—' : player.grade.toFixed(1)}
        </strong>
      </div>
      <p className="mt-2 text-slate-400">
        {[
          player.height,
          player.weight ? `${player.weight} lbs` : null,
          player.fortyTime ? `${player.fortyTime.toFixed(2)}s 40` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div className="mt-2 flex justify-between gap-2">
        {player.production != null && <span>Production {Math.round(player.production)}</span>}
        {player.physical != null && <span>Physical {Math.round(player.physical)}</span>}
      </div>
    </PlayerTradingCard>
  )
}
