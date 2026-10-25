import { redirect } from 'next/navigation'
export default async function TeamBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string }>
}) {
  const { leagueId } = await searchParams
  redirect(`/league-buddy${leagueId ? `?leagueId=${encodeURIComponent(leagueId)}` : ''}`)
}
