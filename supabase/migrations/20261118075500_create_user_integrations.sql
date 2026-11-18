create table if not exists public.user_integrations (
  id bigint generated always as identity primary key,
  connection_key uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  athlete_id text,
  athlete_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scopes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_integrations_connection_provider_unique unique (connection_key, provider)
);

create index if not exists idx_user_integrations_user_id
  on public.user_integrations (user_id)
  where user_id is not null;

alter table public.user_integrations enable row level security;

revoke all on table public.user_integrations from anon, authenticated;
