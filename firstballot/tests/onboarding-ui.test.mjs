import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost/' })
for (const key of [
  'window',
  'document',
  'HTMLElement',
  'HTMLInputElement',
  'Element',
  'Node',
  'NodeFilter',
  'MutationObserver',
  'CustomEvent',
  'Event',
])
  globalThis[key] =
    key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key]
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.getComputedStyle = dom.window.getComputedStyle
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { TourDialog } = await import('../components/onboarding/TourDialog.tsx')
const { act } = React
async function mount(desktop) {
  let dismissals = 0,
    finishes = 0
  function Harness() {
    const [step, setStep] = React.useState(0)
    const [open, setOpen] = React.useState(true)
    return React.createElement(TourDialog, {
      open,
      step,
      setStep,
      desktop,
      dynasty: true,
      returning: true,
      onDismiss: () => {
        dismissals++
        setOpen(false)
      },
      onFinish: () => {
        finishes++
      },
    })
  }
  const root = createRoot(document.getElementById('app'))
  await act(async () => root.render(React.createElement(Harness)))
  const click = async (text) => {
    const b = [...document.querySelectorAll('button')].find((b) => b.textContent === text)
    assert.ok(b, text)
    await act(async () => b.click())
  }
  return {
    root,
    click,
    get dismissals() {
      return dismissals
    },
    get finishes() {
      return finishes
    },
  }
}
test('tour advances, goes back, finishes once and dismisses dialog', async () => {
  const v = await mount(true)
  assert.match(document.body.textContent, /WELCOME BACK/)
  await v.click('Next')
  assert.match(document.body.textContent, /Read your team/)
  await v.click('Back')
  assert.match(document.body.textContent, /Your next move/)
  await v.click('Next')
  await v.click('Next')
  assert.match(document.body.textContent, /projected MaxPF/)
  await v.click('Next')
  await v.click('Open my map')
  assert.equal(v.dismissals, 1)
  assert.equal(v.finishes, 1)
  assert.equal(document.querySelector('[role="dialog"]'), null)
  await act(async () => v.root.unmount())
})
test('mobile skip dismisses without navigating or mutating a plan', async () => {
  const v = await mount(false)
  await v.click('Next')
  assert.match(document.body.textContent, /desktop browser/)
  await v.click('Skip tour')
  assert.equal(v.dismissals, 1)
  assert.equal(v.finishes, 0)
  await act(async () => v.root.unmount())
})

// Geometry is browser-owned; these fixtures exercise navigation against real anchors.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)
globalThis.cancelAnimationFrame = clearTimeout
dom.window.HTMLElement.prototype.scrollIntoView = function () {}
const { MapWalkthrough } = await import('../components/onboarding/MapWalkthrough.tsx')
test('map guide walks live anchors, skips dynasty years for redraft and closes once', async () => {
  const anchors = document.createElement('main')
  anchors.innerHTML = ['lineup', 'zoom', 'years', 'targets', 'plans']
    .map((a) => `<div data-map-tour="${a}">Feature ${a}</div>`)
    .join('')
  document.body.append(anchors)
  let closed = 0
  const root = createRoot(document.getElementById('app'))
  function Harness() {
    const [open, setOpen] = React.useState(true)
    return open
      ? React.createElement(MapWalkthrough, {
          dynasty: false,
          onDismiss: () => {
            closed++
            setOpen(false)
          },
        })
      : null
  }
  await act(async () => {
    root.render(React.createElement(Harness))
    await new Promise((r) => setTimeout(r, 20))
  })
  const click = async (text) => {
    const button = () =>
      [...document.querySelectorAll('button')].find((b) => b.textContent === text)
    // React commits the anchor effect after act; wait for its animation frame before clicking.
    for (let attempt = 0; attempt < 50 && button()?.disabled; attempt++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    }
    assert.ok(button(), `Missing ${text} button`)
    assert.equal(button().disabled, false, `${text} should be ready after anchor measurement`)
    await act(async () => {
      button().click()
    })
  }
  assert.match(document.body.textContent, /This is your team map/)
  await click('Next')
  assert.match(document.body.textContent, /Get the whole picture/)
  await click('Next')
  assert.match(document.body.textContent, /Find your next move/)
  await click('Back')
  assert.match(document.body.textContent, /Get the whole picture/)
  await click('Next')
  await click('Next')
  assert.match(document.body.textContent, /Keep the strategy/)
  await click('Start planning')
  assert.equal(closed, 1)
  assert.equal(document.querySelector('[role="dialog"]'), null)
  await act(async () => root.unmount())
  anchors.remove()
})
