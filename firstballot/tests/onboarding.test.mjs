import test from 'node:test'
import assert from 'node:assert/strict'
import { TOUR_VERSION, hasSeenTour, tourStorageKey, tourSteps } from '../lib/onboarding.ts'
test('tour dismissal is versioned and scoped to each account', () => {
  assert.notEqual(tourStorageKey('alice'), tourStorageKey('bob'))
  assert.equal(hasSeenTour({}, null), false)
  assert.equal(hasSeenTour({ product_tour_version: TOUR_VERSION }, null), true)
  assert.equal(hasSeenTour({}, TOUR_VERSION), true)
  assert.equal(hasSeenTour({ product_tour_version: 'old' }, 'old'), false)
})
test('mobile and redraft instructions do not promise future-rookie planning', () => {
  assert.match(tourSteps(false, false)[1].body, /desktop browser/)
  assert.match(tourSteps(true, false)[2].body, /current season/)
  assert.match(tourSteps(true, true)[2].body, /picks rail/)
  assert.match(tourSteps(true, true)[3].hint, /Save plans/)
})
