'use client'
import { ActionPlanPanel } from './ActionPlanPanel'
import type { TeamPlacement } from './competitiveState'
export function AuditSection({ placement }: { placement?: TeamPlacement }) {
  return <ActionPlanPanel placement={placement} />
}
