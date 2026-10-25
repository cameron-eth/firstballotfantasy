'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { StrategyCard } from '@/components/league-buddy/builder/StrategyCard'
import type { Candidate, CommunityRating } from '@/lib/community/rating'
export type DailyBallot = {
  day: string
  pool: 'dynasty' | 'nfl'
  voted: boolean
  winner?: string
  choices: [Candidate, Candidate]
  rankings: CommunityRating[]
  choiceRatings: CommunityRating[]
  totalVotes: number
}
export function DailyRankingDialog({
  open,
  onClose,
  data,
  onVote,
  saving,
  error,
}: {
  open: boolean
  onClose: () => void
  data: DailyBallot
  onVote: (key: string) => void
  saving: boolean
  error: string
}) {
  const [showBoard, setShowBoard] = useState(false)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="w-[calc(100%-24px)] max-w-2xl sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl border-slate-700 bg-slate-950 p-4 sm:p-6">
        <div className="pr-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">
            The community ballot · Daily pick
          </p>
          <DialogTitle className="text-xl text-white">
            {showBoard
              ? 'Community rankings'
              : data.voted
                ? 'Your pick is in.'
                : data.pool === 'dynasty'
                  ? 'Who would you build around?'
                  : 'Who would you roster this season?'}
          </DialogTitle>
          <DialogDescription className="mt-2 text-xs leading-relaxed text-slate-400">
            {data.pool === 'dynasty'
              ? 'Long-term dynasty value · superflex · PPR. Prospects and pros share the same comparison pool.'
              : 'Current-season value · 1QB · PPR.'}{' '}
            One pick per account each day.
          </DialogDescription>
        </div>
        {showBoard ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              {data.pool === 'dynasty' ? 'College prospect community board' : 'NFL community board'}{' '}
              · {data.totalVotes} ballots. Neutral score: 1,500. At least 5 comparisons to receive a
              provisional rank; early samples and disconnected comparisons remain uncertain.
            </p>
            {data.rankings.length ? (
              <ol className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                {data.rankings.map((p) => (
                  <li key={p.key} className="flex items-center gap-3 py-3 text-sm">
                    <span className="w-7 text-slate-500">{p.rank ?? '—'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        {p.position} · {p.team}
                        {p.year ? ` · ${p.year}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <strong className="text-blue-300">{p.score}</strong>
                      <p className="text-[10px] text-slate-500">{p.comparisons} picks</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                The board starts with the first vote. No artificial community rankings.
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              Scores use a regularized Bradley–Terry model: winning against stronger opponents
              carries more weight. Scouting grades remain separate.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {data.choices.map((p) => (
                <StrategyCard
                  key={p.key}
                  name={p.name}
                  position={p.position}
                  team={p.team}
                  image={p.image}
                  label={p.kind === 'prospect' ? `${p.year} prospect` : 'Current NFL'}
                  action={
                    data.voted ? (data.winner === p.key ? 'Your pick ✓' : 'Not selected') : 'Pick'
                  }
                  disabled={saving || data.voted}
                  onAction={() => onVote(p.key)}
                />
              ))}
            </div>
            {data.voted && (
              <p role="status" className="text-sm text-emerald-300">
                Saved. Your vote now contributes to the community model.
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs">
          <button className="text-slate-400 hover:text-white" onClick={onClose}>
            {data.voted ? 'Done' : 'Not today'}
          </button>
          <button
            className="text-blue-300 hover:text-white"
            onClick={() => setShowBoard(!showBoard)}
          >
            {showBoard ? 'Back to ballot' : 'View community board'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
