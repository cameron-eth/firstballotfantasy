// User Draftboard type for saving/loading the single draft board per user

export interface Draftboard {
  id: string
  user_id: string
  name: string
  draft_year: number
  prospect_ids: number[]
  created_at: string
  updated_at: string
}

export interface SaveDraftboardRequest {
  id?: string
  name: string
  draft_year?: number
  prospect_ids: number[]
}
