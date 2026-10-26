'use client'
import { ArrowRight, Check, Compass, MousePointer2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import type { CardProspect } from '@/components/landing/ProspectTradingCard'
import { tourSteps } from '@/lib/onboarding'
const secondary =
  'rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800'
export function TourDialog({
  open,
  step,
  setStep,
  desktop,
  dynasty,
  returning,
  prospect,
  onDismiss,
  onFinish,
}: {
  open: boolean
  step: number
  setStep: (step: number) => void
  desktop: boolean
  dynasty: boolean
  returning: boolean
  prospect?: CardProspect
  onDismiss: () => void
  onFinish: () => void
}) {
  const steps = tourSteps(desktop, dynasty)
  const showProspect = dynasty && step !== 3
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss()
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%-24px)] max-w-3xl overflow-y-auto rounded-2xl border-slate-700 bg-[#0c1220] p-5 sm:p-7">
        <div className="pr-8">
          <p className="mb-2 text-xs font-semibold tracking-widest text-blue-300">
            {returning ? 'WELCOME BACK TO FIRST BALLOT' : 'WELCOME TO FIRST BALLOT'}
          </p>
          <DialogTitle className="text-2xl tracking-tight text-white">
            {steps[step].title}
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            {steps[step].body}
          </DialogDescription>
        </div>
        <div
          className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950 p-4"
          style={{
            backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Compass size={14} /> Example plan
            </span>
            <span>{step === 2 && dynasty ? 'Future roster' : 'Your roster → your next move'}</span>
          </div>
          <div className="mx-auto grid max-w-lg grid-cols-2 items-center gap-4 sm:gap-8">
            <PlayerTradingCard
              compact
              imageHeight="h-28 sm:h-36"
              name="Chris Olave"
              position="WR"
              team="NO"
              image="https://a.espncdn.com/i/headshots/nfl/players/full/4361370.png"
              badge="Your roster"
            />
            <div className="relative">
              <ArrowRight
                aria-hidden="true"
                size={16}
                className="absolute -left-4 top-1/2 text-blue-300 sm:-left-6"
              />
              <PlayerTradingCard
                compact
                imageHeight="h-28 sm:h-36"
                name={
                  showProspect ? (prospect?.name ?? 'Your next cornerstone') : 'Justin Jefferson'
                }
                position="WR"
                team={showProspect ? 'Ohio State' : 'MIN'}
                image={
                  showProspect
                    ? prospect?.headshot_url
                    : 'https://a.espncdn.com/i/headshots/nfl/players/full/4262921.png'
                }
                badge={step === 3 ? 'Review before sending' : 'Explore the fit'}
              />
            </div>
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-blue-200">
          <MousePointer2 size={15} className="mt-0.5 shrink-0" />
          {steps[step].hint}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <button className={secondary} onClick={() => onDismiss()}>
            Skip tour
          </button>
          <div className="flex items-center gap-3">
            <span aria-live="polite" className="text-xs text-slate-400">
              {step + 1} / {steps.length}
            </span>
            {step > 0 && (
              <button className={secondary} onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-blue-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-200"
              onClick={() => {
                if (step < steps.length - 1) setStep(step + 1)
                else {
                  onDismiss()
                  onFinish()
                }
              }}
            >
              {step === steps.length - 1
                ? returning
                  ? desktop
                    ? 'Open my map'
                    : 'Open my team'
                  : 'Connect my team'
                : 'Next'}
              {step === steps.length - 1 ? <Check size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-500">
          Replay anytime from Settings or Map guide. One team is free; Unlimited is optional.
        </p>
      </DialogContent>
    </Dialog>
  )
}
