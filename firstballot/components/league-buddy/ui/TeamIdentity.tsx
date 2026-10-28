import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'

/** Avatar plus team name, with the owner as quiet meta. Used wherever a team is a row. */
export function TeamIdentity({
  teamName,
  ownerName,
  avatarId,
  tag,
  className,
}: {
  teamName: string
  ownerName?: string
  avatarId?: string
  /** Short marker after the name, e.g. "Viewing" for the selected team. */
  tag?: string
  className?: string
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <UserAvatar avatarId={avatarId} displayName={ownerName || teamName} size={28} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-white">{teamName}</span>
          {tag && (
            <span className="shrink-0 rounded-md border border-action/40 bg-action/10 px-1.5 py-0.5 text-badge font-semibold leading-none text-blue-100">
              {tag}
            </span>
          )}
        </span>
        {ownerName && <span className="block truncate text-2xs text-slate-500">{ownerName}</span>}
      </span>
    </span>
  )
}
