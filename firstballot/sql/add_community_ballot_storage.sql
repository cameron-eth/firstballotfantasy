-- Provisioned via Storage API in the live project. Equivalent setup for other deployments.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-ballots','community-ballots',false,4096,ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;
-- Deliberately no anon/authenticated object policy. Authenticated Next.js handlers validate
-- identities and daily pair membership before service-role access.
