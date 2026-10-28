// Stand-ins for Next's app-router hooks, so the dashboard can mount outside Next for the
// render benchmark (scripts/bench/render.mjs). Navigation is recorded, never performed.
const navigations = []
const router = {
  push: (url) => navigations.push(url),
  replace: (url) => navigations.push(url),
  prefetch: () => {},
  back: () => {},
  refresh: () => {},
}
const params = new URLSearchParams('tab=overview')
module.exports = {
  navigations,
  useRouter: () => router,
  useSearchParams: () => params,
  usePathname: () => '/league-buddy',
  redirect: () => {},
  notFound: () => {},
}
