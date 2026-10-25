-- Private storage; only authenticated server routes access account-scoped paths.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-scenarios', 'team-scenarios', false, 150000, array['application/json'])
on conflict (id) do nothing;
