import test from 'node:test'
import assert from 'node:assert/strict'
import { isProxyableImage, playerImageSrc } from '../lib/player-image.ts'

test('only known headshot CDNs are proxied', () => {
  assert.equal(isProxyableImage('https://a.espncdn.com/i/headshots/nfl/players/full/4046.png'), true)
  assert.equal(isProxyableImage('https://sleepercdn.com/content/nfl/players/4046.jpg'), true)
  assert.equal(isProxyableImage('https://static.www.nfl.com/image/upload/f_auto,q_auto/league/abc'), true)
  assert.equal(isProxyableImage('http://a.espncdn.com/i/headshots/nfl/players/full/4046.png'), false)
  assert.equal(isProxyableImage('https://a.espncdn.com.evil.test/i/headshots/nfl/players/x.png'), false)
  assert.equal(isProxyableImage('https://a.espncdn.com/other/path.png'), false)
  assert.equal(isProxyableImage('http://169.254.169.254/latest/meta-data'), false)
})

test('proxy URL carries the cache version and leaves other URLs alone', () => {
  const src = 'https://a.espncdn.com/i/headshots/nfl/players/full/4046.png'
  assert.equal(playerImageSrc(src, 7), `/api/player-image?u=${encodeURIComponent(src)}&v=7`)
  assert.equal(playerImageSrc('/logo.png', 7), '/logo.png')
})
