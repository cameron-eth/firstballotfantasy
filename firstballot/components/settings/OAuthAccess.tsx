'use client'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { useState } from 'react'
export function OAuthAccess() {
  const { user } = useAuth()
  const { data, mutate } = useSWR(user ? ['oauth-grants', user.id] : null, async () => {
    const url = '/api/account/oauth-grants'
    const r = await fetch(url)
    if (!r.ok) return { grants: [] }
    return r.json()
  })
  const [notice, setNotice] = useState('')
  async function revoke(clientId: string) {
    const r = await fetch('/api/account/oauth-grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', clientId }),
    })
    setNotice(r.ok ? 'Assistant access revoked.' : 'Could not revoke access. Retry.')
    await mutate()
  }
  if (!data?.grants?.length) return null
  return (
    <section className="mt-7 rounded-2xl border border-slate-700 p-6">
      <h2 className="font-semibold text-white">Connected assistants</h2>
      {data.grants.map((g: { client_id: string; revoked_at: string | null }) => (
        <div key={g.client_id} className="mt-3 flex items-center justify-between gap-3">
          <span className="truncate text-sm text-slate-400">{g.client_id}</span>
          {g.revoked_at ? (
            <span className="text-xs text-slate-500">Revoked</span>
          ) : (
            <button
              onClick={() => revoke(g.client_id)}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
            >
              Revoke
            </button>
          )}
        </div>
      ))}
      {notice && (
        <p role="status" className="mt-3 text-sm text-blue-300">
          {notice}
        </p>
      )}
    </section>
  )
}
