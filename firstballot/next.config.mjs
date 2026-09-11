import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Pinned so Turbopack picks this directory as the project root rather than inferring
// it from the repo root, which also holds a lockfile. Derived from this file's own
// location — a hardcoded absolute path breaks `next dev` on every machine but one.
const projectRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
}

export default nextConfig
