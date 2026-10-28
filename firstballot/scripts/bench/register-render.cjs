// Preload for scripts/bench/render.mjs: resolve next/navigation to the benchmark stub.
const Module = require('node:module')
const path = require('node:path')
const stub = path.join(__dirname, 'next-stub.cjs')
const original = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
  if (request === 'next/navigation' || request === 'next/navigation.js') return stub
  return original.call(this, request, ...rest)
}
