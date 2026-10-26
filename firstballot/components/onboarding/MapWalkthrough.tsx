'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, X } from 'lucide-react'

const steps = [
  {
    anchor: 'lineup',
    title: 'This is your team map.',
    body: 'Your league’s starting slots run across the top. Each starter appears once, with current-season FPPG and dynasty value on their card. Shared backup stacks show the depth behind them.',
  },
  {
    anchor: 'zoom',
    title: 'Get the whole picture.',
    body: 'Pinch to zoom, or use these controls. Zoom out to compare your entire lineup; zoom in to read a player card. Click the percentage to reset the view.',
  },
  {
    anchor: 'years',
    title: 'Choose how far ahead to plan.',
    body: 'Now is your current roster. Choose a future year to see when prospects can arrive. Your owned picks appear in that future view; projected MaxPF estimates their slots. A target you cannot afford needs a plan to acquire draft capital.',
  },
  {
    anchor: 'targets',
    title: 'Find your next move.',
    body: 'Search trade targets or, in dynasty, college prospects here. Add a target to explore their fit. On the map, Show trade targets opens suggested cards beside a player. Any real trade still requires a separate review and confirmation.',
  },
  {
    anchor: 'plans',
    title: 'Keep the strategy you believe in.',
    body: 'Open Plans to name, duplicate and save a scenario. Planning never changes your live Sleeper lineup. Start with a target, compare the cost, then save your next move.',
  },
]

type Bounds = { top: number; left: number; width: number; height: number }

/** Tour geometry is isolated from the map: scroll/resize never rerenders its player cards. */
export function MapWalkthrough({
  dynasty,
  onDismiss,
}: {
  dynasty: boolean
  onDismiss: () => void
}) {
  const available = steps.filter((step) => dynasty || step.anchor !== 'years')
  const [index, setIndex] = useState(0)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [panelHeight, setPanelHeight] = useState(300)
  const panel = useRef<HTMLDivElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  const step = available[index]

  useEffect(() => {
    let target: HTMLElement | null = null
    let frame = 0
    let scrolled = false
    setBounds(null)
    setUnavailable(false)
    const measure = () => {
      frame = 0
      const found = document.querySelector<HTMLElement>(`[data-map-tour="${step.anchor}"]`)
      if (!found) {
        setBounds(null)
        return
      }
      if (target !== found) {
        if (target) resize.unobserve(target)
        target = found
        resize.observe(target)
      }
      if (!scrolled) {
        target.scrollIntoView({ block: 'center', behavior: 'instant' })
        scrolled = true
      }
      const r = target.getBoundingClientRect()
      const top = Math.max(8, r.top - 6)
      const left = Math.max(8, r.left - 6)
      const right = Math.min(window.innerWidth - 8, r.right + 6)
      const bottom = Math.min(window.innerHeight - 8, r.bottom + 6)
      setBounds({ top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) })
      setUnavailable(false)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const resize = new ResizeObserver(schedule)
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.querySelector('[aria-label="League dashboard"]') ?? document.body, {
      childList: true,
      subtree: true,
    })
    schedule()
    const timeout = window.setTimeout(() => {
      if (!document.querySelector(`[data-map-tour="${step.anchor}"]`)) setUnavailable(true)
    }, 12000)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    next.current?.focus({ preventScroll: true })
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timeout)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [step.anchor])

  useLayoutEffect(() => {
    if (!panel.current) return
    const observer = new ResizeObserver(() => setPanelHeight(panel.current?.offsetHeight ?? 300))
    observer.observe(panel.current)
    return () => observer.disconnect()
  }, [])

  const width = typeof window === 'undefined' ? 380 : Math.min(380, window.innerWidth - 32)
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight
  const viewportWidth = typeof window === 'undefined' ? 1200 : window.innerWidth
  const left = bounds
    ? Math.min(viewportWidth - width - 16, Math.max(16, bounds.left + bounds.width - width))
    : (viewportWidth - width) / 2
  const below = bounds ? bounds.top + bounds.height + 16 : 100
  const top = bounds
    ? below + panelHeight < viewportHeight - 16
      ? below
      : Math.max(16, bounds.top - panelHeight - 16)
    : 100
  const shade = 'fixed bg-slate-950/60 backdrop-blur-[5px]'
  const secondary =
    'rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 focus-visible:outline focus-visible:outline-blue-300'
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onDismiss()
      }}
    >
      <Dialog.Portal>
        <div className="fixed inset-0 z-[100] pointer-events-none" aria-hidden="true">
          {bounds ? (
            <>
              <div className={shade} style={{ inset: `0 0 auto 0`, height: bounds.top }} />
              <div
                className={shade}
                style={{ top: bounds.top, left: 0, width: bounds.left, height: bounds.height }}
              />
              <div
                className={shade}
                style={{
                  top: bounds.top,
                  left: bounds.left + bounds.width,
                  right: 0,
                  height: bounds.height,
                }}
              />
              <div
                className={shade}
                style={{ top: bounds.top + bounds.height, left: 0, right: 0, bottom: 0 }}
              />
              <div
                className="fixed rounded-xl border-2 border-blue-300 shadow-[0_0_28px_#60a5fa40] motion-safe:transition-[top,left,width,height] motion-safe:duration-200"
                style={bounds}
              />
            </>
          ) : (
            <div className={`${shade} inset-0`} />
          )}
        </div>
        <Dialog.Content
          ref={panel}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed z-[101] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-blue-300/40 bg-[#101a2c] p-5 shadow-2xl outline-none motion-safe:transition-[top,left] motion-safe:duration-200"
          style={{ width, top, left }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium tracking-widest text-blue-300">
              MAP GUIDE · {index + 1} / {available.length}
            </span>
            <Dialog.Close
              aria-label="Close map guide"
              className="rounded p-1 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Title className="text-lg font-semibold text-white">{step.title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-slate-300">
            {step.body}
          </Dialog.Description>
          {!bounds && (
            <p role="status" className="mt-3 text-xs text-amber-200">
              {unavailable
                ? 'This part of the map is unavailable. Connect and activate a team, then replay Map guide. You can also skip this step.'
                : 'Opening your team map…'}
            </p>
          )}
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
            <button className={secondary} onClick={onDismiss}>
              Skip tour
            </button>
            <div className="flex gap-1">
              {index > 0 && (
                <button className={secondary} onClick={() => setIndex(index - 1)}>
                  Back
                </button>
              )}
              <button
                ref={next}
                disabled={!bounds && !unavailable}
                className="flex items-center gap-2 rounded-lg bg-blue-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-200 disabled:opacity-40"
                onClick={() => (index === available.length - 1 ? onDismiss() : setIndex(index + 1))}
              >
                {index === available.length - 1 ? 'Start planning' : 'Next'}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
