'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
type Token = {
  id: string
  name: string
  prefix: string
  expires_at: string
  revoked_at: string | null
}
type Team = { id: string; name: string; active: boolean }
const button =
  'rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 disabled:opacity-40 hover:bg-slate-800'
async function get(url: string) {
  const r = await fetch(url)
  const b = await r.json()
  if (!r.ok) throw new Error(b.error)
  return b
}
export function ApiAccess() {
  const { user } = useAuth()
  const { data, mutate, error } = useSWR(user ? ['access-tokens', user.id] : null, () =>
      get('/api/account/access-tokens')
    ),
    { data: teams } = useSWR(user ? ['api-teams', user.id] : null, () => get('/api/account/teams'))
  const { data: usage } = useSWR(user ? ['api-usage', user.id] : null, () =>
    get('/api/account/usage')
  )
  const [name, setName] = useState(''),
    [ids, setIds] = useState<string[]>([]),
    [secret, setSecret] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  async function submit(input: object) {
    setBusy(true)
    setNotice('')
    setSecret('')
    try {
      const r = await fetch('/api/account/access-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      if (b.token) {
        setSecret(b.token)
        setName('')
      }
      setNotice(b.token ? 'Token created. Copy it now; it is only shown once.' : 'Access revoked.')
      await mutate()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Unable to update access')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="mt-7 rounded-2xl border border-slate-700 bg-slate-900 p-6">
      <h2 className="font-semibold text-white">API & MCP access</h2>
      <p className="mt-2 text-sm text-slate-400">
        Read-only access to selected active teams. Tokens expire after 30 days. Free accounts
        include 100 requests per UTC day; paid accounts include 1,000. No overage charges.
      </p>
      {usage && (
        <p className="mt-3 text-sm text-blue-300">
          {usage.used} / {usage.limit} requests used today · resets at 00:00 UTC
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-amber-300">
          {error.message}
        </p>
      )}
      <label className="mt-4 block text-sm text-slate-300">
        Connection name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="My assistant"
          className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 p-3"
        />
      </label>
      <fieldset className="mt-3 space-y-2">
        <legend className="mb-2 text-sm text-slate-400">Teams this connection can read</legend>
        {teams?.teams
          .filter((t: Team) => t.active)
          .map((t: Team) => (
            <label key={t.id} className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={ids.includes(t.id)}
                onChange={(e) =>
                  setIds(e.target.checked ? [...ids, t.id] : ids.filter((id) => id !== t.id))
                }
              />
              {t.name}
            </label>
          ))}
      </fieldset>
      <button
        className={`${button} mt-4`}
        disabled={busy || !name.trim() || !ids.length}
        onClick={() => submit({ name, teamIds: ids })}
      >
        Create read-only token
      </button>
      {notice && (
        <p role="status" className="mt-3 text-sm text-blue-300">
          {notice}
        </p>
      )}
      {secret && (
        <div className="mt-3">
          <input
            aria-label="New API token"
            readOnly
            value={secret}
            className="w-full rounded-lg bg-slate-950 p-3 font-mono text-xs text-blue-200"
          />
          <button
            className={`${button} mt-2`}
            onClick={() => {
              navigator.clipboard
                .writeText(secret)
                .then(() => setNotice('Copied.'))
                .catch(() => setNotice('Select the token above and copy it.'))
            }}
          >
            Copy token
          </button>
        </div>
      )}
      <ul className="mt-5 divide-y divide-slate-800">
        {data?.tokens.map((t: Token) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm text-white">{t.name}</p>
              <p className="text-xs text-slate-400">
                {t.prefix}… ·{' '}
                {t.revoked_at
                  ? 'Revoked'
                  : `Expires ${new Date(t.expires_at).toLocaleDateString()}`}
              </p>
            </div>
            {!t.revoked_at && (
              <button
                disabled={busy}
                className={button}
                onClick={() => submit({ action: 'revoke', id: t.id })}
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        API: /api/v1/teams · MCP: /api/mcp. Use the token as a Bearer authorization header in your
        client.
      </p>
    </section>
  )
}
