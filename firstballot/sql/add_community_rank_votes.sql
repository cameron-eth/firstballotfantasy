-- Each signed-in scout has one current choice per comparable player pair.
-- RLS keeps individual ballots private. Aggregates expose counts only.
CREATE TABLE IF NOT EXISTS public.community_rank_votes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool text NOT NULL CHECK (pool IN ('nfl', 'prospect')),
  pair_key text NOT NULL,
  winner_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pool, pair_key),
  CHECK (char_length(pair_key) <= 120 AND char_length(winner_key) <= 60)
);
ALTER TABLE public.community_rank_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_rank_votes_select_own ON public.community_rank_votes;
CREATE POLICY community_rank_votes_select_own ON public.community_rank_votes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS community_rank_votes_insert_own ON public.community_rank_votes;
CREATE POLICY community_rank_votes_insert_own ON public.community_rank_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS community_rank_votes_update_own ON public.community_rank_votes;
CREATE POLICY community_rank_votes_update_own ON public.community_rank_votes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.community_pair_counts(request_pool text, request_pair_key text)
RETURNS TABLE(winner_key text, vote_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.winner_key, count(*)::bigint
  FROM public.community_rank_votes v
  WHERE v.pool = request_pool AND v.pair_key = request_pair_key
  GROUP BY v.winner_key;
$$;
REVOKE ALL ON FUNCTION public.community_pair_counts(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_pair_counts(text, text) TO anon, authenticated;
