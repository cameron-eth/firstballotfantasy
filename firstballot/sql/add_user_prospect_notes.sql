-- Apply once in Supabase before using personal scouting notes.
CREATE TABLE IF NOT EXISTS public.user_prospect_notes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id integer NOT NULL REFERENCES public.dynasty_prospects(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 5000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, prospect_id)
);

ALTER TABLE public.user_prospect_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_prospect_notes_select_own ON public.user_prospect_notes;
CREATE POLICY user_prospect_notes_select_own ON public.user_prospect_notes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_prospect_notes_insert_own ON public.user_prospect_notes;
CREATE POLICY user_prospect_notes_insert_own ON public.user_prospect_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_prospect_notes_update_own ON public.user_prospect_notes;
CREATE POLICY user_prospect_notes_update_own ON public.user_prospect_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_prospect_notes_delete_own ON public.user_prospect_notes;
CREATE POLICY user_prospect_notes_delete_own ON public.user_prospect_notes FOR DELETE USING (auth.uid() = user_id);
