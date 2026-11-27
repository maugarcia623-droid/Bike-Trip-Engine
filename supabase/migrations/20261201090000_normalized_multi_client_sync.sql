-- Normalized multi-client sync schema (Web + iOS SwiftData)
-- Replaces full-blob overwrites in legacy public.user_state.app_data

-- 1. Rider Profile & Preferences (1 row per user)
create table if not exists public.rider_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 2,
  rider_name text,
  active_trip_client_id text,
  active_bike_client_id text,
  specs jsonb not null default '{}'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rider_profiles_schema_version_check check (schema_version >= 1),
  constraint rider_profiles_specs_object_check check (jsonb_typeof(specs) = 'object'),
  constraint rider_profiles_profile_object_check check (jsonb_typeof(profile) = 'object')
);

-- 2. Bike Garage (1 row per bike; supports concurrent edits & soft deletes)
create table if not exists public.rider_bikes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  schema_version integer not null default 2,
  name text not null default '',
  category text not null default 'gravel',
  payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint rider_bikes_user_client_unique unique (user_id, client_id),
  constraint rider_bikes_client_id_nonempty check (char_length(btrim(client_id)) > 0),
  constraint rider_bikes_schema_version_check check (schema_version >= 1),
  constraint rider_bikes_payload_object_check check (jsonb_typeof(payload) = 'object')
);

-- 3. Saved Trips (1 row per trip; eliminates full-library blob conflicts)
create table if not exists public.user_trips (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  schema_version integer not null default 2,
  name text not null default '',
  tag text not null default '',
  departure_date date,
  payload jsonb not null,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_trips_user_client_unique unique (user_id, client_id),
  constraint user_trips_client_id_nonempty check (char_length(btrim(client_id)) > 0),
  constraint user_trips_schema_version_check check (schema_version >= 1),
  constraint user_trips_payload_object_check check (jsonb_typeof(payload) = 'object')
);

-- Composite indexes for owner-scoped delta sync & tombstones
create index if not exists idx_rider_bikes_user_updated
  on public.rider_bikes (user_id, updated_at desc);

create index if not exists idx_user_trips_user_updated
  on public.user_trips (user_id, updated_at desc);

-- Partial indexes for active (non-deleted) reads
create index if not exists idx_rider_bikes_user_active
  on public.rider_bikes (user_id, sort_order, client_id)
  where deleted_at is null;

create index if not exists idx_user_trips_user_active
  on public.user_trips (user_id, updated_at desc)
  where deleted_at is null;

-- Monotonic server updated_at trigger for delta sync cursors
create or replace function public.touch_v2_sync_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists trg_rider_profiles_updated_at on public.rider_profiles;
create trigger trg_rider_profiles_updated_at
  before insert or update on public.rider_profiles
  for each row
  execute function public.touch_v2_sync_updated_at();

drop trigger if exists trg_rider_bikes_updated_at on public.rider_bikes;
create trigger trg_rider_bikes_updated_at
  before insert or update on public.rider_bikes
  for each row
  execute function public.touch_v2_sync_updated_at();

drop trigger if exists trg_user_trips_updated_at on public.user_trips;
create trigger trg_user_trips_updated_at
  before insert or update on public.user_trips
  for each row
  execute function public.touch_v2_sync_updated_at();

-- Row Level Security (cached (select auth.uid()) per statement)
alter table public.rider_profiles enable row level security;
alter table public.rider_bikes enable row level security;
alter table public.user_trips enable row level security;

revoke all on table public.rider_profiles from public, anon;
revoke all on table public.rider_bikes from public, anon;
revoke all on table public.user_trips from public, anon;

grant select, insert, update, delete on table public.rider_profiles to authenticated;
grant select, insert, update, delete on table public.rider_bikes to authenticated;
grant select, insert, update, delete on table public.user_trips to authenticated;

drop policy if exists rider_profiles_owner_all on public.rider_profiles;
create policy rider_profiles_owner_all on public.rider_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists rider_bikes_owner_all on public.rider_bikes;
create policy rider_bikes_owner_all on public.rider_bikes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists user_trips_owner_all on public.user_trips;
create policy user_trips_owner_all on public.user_trips
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Idempotent one-time legacy migration helper (user_state.app_data -> v2 tables)
create or replace function public.backfill_user_state_to_v2()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_app_data jsonb;
  v_legacy_updated_at timestamptz;
  v_default_client_ts timestamptz;
  v_specs_raw jsonb;
  v_specs_clean jsonb;
  v_profile jsonb;
  v_rider_name text;
  v_active_trip_id text;
  v_active_bike_id text;
  v_elem jsonb;
  v_ord bigint;
  v_client_id text;
  v_bike_name text;
  v_bike_cat text;
  v_trip_name text;
  v_trip_tag text;
  v_dep_date_text text;
  v_dep_date date;
  v_item_ts timestamptz;
  v_row_count integer := 0;
  v_profiles_inserted integer := 0;
  v_bikes_inserted integer := 0;
  v_trips_inserted integer := 0;
  v_skipped integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if pg_catalog.to_regclass('public.user_state') is null then
    return pg_catalog.jsonb_build_object(
      'status', 'no_legacy_table',
      'profiles_inserted', 0,
      'bikes_inserted', 0,
      'trips_inserted', 0,
      'skipped', 0
    );
  end if;

  execute
    'select app_data::jsonb, updated_at from public.user_state where user_id = $1 limit 1'
    into v_app_data, v_legacy_updated_at
    using v_user_id;

  if not found
     or v_app_data is null
     or pg_catalog.jsonb_typeof(v_app_data) <> 'object'
     or v_app_data = '{}'::jsonb then
    return pg_catalog.jsonb_build_object(
      'status', 'no_legacy_data',
      'profiles_inserted', 0,
      'bikes_inserted', 0,
      'trips_inserted', 0,
      'skipped', 0
    );
  end if;

  v_default_client_ts := coalesce(v_legacy_updated_at, pg_catalog.now());
  if nullif(pg_catalog.btrim(v_app_data->>'updatedAt'), '') is not null then
    begin
      v_default_client_ts := (pg_catalog.btrim(v_app_data->>'updatedAt'))::timestamptz;
    exception when others then
      v_default_client_ts := coalesce(v_legacy_updated_at, pg_catalog.now());
    end;
  end if;

  v_specs_raw := case
    when pg_catalog.jsonb_typeof(v_app_data->'riderSpecs') = 'object'
      then v_app_data->'riderSpecs'
    else '{}'::jsonb
  end;
  v_specs_clean := v_specs_raw - 'bikes';

  v_profile := case
    when pg_catalog.jsonb_typeof(v_app_data->'userProfile') = 'object'
      then v_app_data->'userProfile'
    else '{}'::jsonb
  end;

  v_rider_name := coalesce(
    nullif(pg_catalog.btrim(v_profile->>'name'), ''),
    nullif(pg_catalog.btrim(v_specs_raw->>'riderName'), '')
  );
  v_active_trip_id := nullif(pg_catalog.btrim(v_app_data->>'activeTripId'), '');
  v_active_bike_id := nullif(pg_catalog.btrim(v_specs_raw->>'activeBikeId'), '');

  if v_specs_clean <> '{}'::jsonb
     or v_profile <> '{}'::jsonb
     or v_rider_name is not null
     or v_active_trip_id is not null
     or v_active_bike_id is not null then
    insert into public.rider_profiles (
      user_id,
      schema_version,
      rider_name,
      active_trip_client_id,
      active_bike_client_id,
      specs,
      profile,
      client_updated_at
    ) values (
      v_user_id,
      2,
      v_rider_name,
      v_active_trip_id,
      v_active_bike_id,
      v_specs_clean,
      v_profile,
      v_default_client_ts
    )
    on conflict (user_id) do nothing;

    get diagnostics v_row_count = row_count;
    v_profiles_inserted := v_profiles_inserted + v_row_count;
  end if;

  if pg_catalog.jsonb_typeof(v_specs_raw->'bikes') = 'array' then
    for v_elem, v_ord in
      select value, ordinality
      from pg_catalog.jsonb_array_elements(v_specs_raw->'bikes') with ordinality
    loop
      if pg_catalog.jsonb_typeof(v_elem) <> 'object' then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_client_id := nullif(pg_catalog.btrim(v_elem->>'id'), '');
      if v_client_id is null then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_bike_name := coalesce(nullif(pg_catalog.btrim(v_elem->>'name'), ''), 'Bike ' || v_ord::text);
      v_bike_cat := coalesce(nullif(pg_catalog.btrim(v_elem->>'bikeCategory'), ''), 'gravel');

      insert into public.rider_bikes (
        user_id,
        client_id,
        schema_version,
        name,
        category,
        payload,
        sort_order,
        client_updated_at
      ) values (
        v_user_id,
        v_client_id,
        2,
        v_bike_name,
        v_bike_cat,
        v_elem,
        (v_ord - 1)::integer,
        v_default_client_ts
      )
      on conflict (user_id, client_id) do nothing;

      get diagnostics v_row_count = row_count;
      v_bikes_inserted := v_bikes_inserted + v_row_count;
    end loop;
  end if;

  if pg_catalog.jsonb_typeof(v_app_data->'trips') = 'array' then
    for v_elem, v_ord in
      select value, ordinality
      from pg_catalog.jsonb_array_elements(v_app_data->'trips') with ordinality
    loop
      if pg_catalog.jsonb_typeof(v_elem) <> 'object' then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_client_id := nullif(pg_catalog.btrim(v_elem->>'id'), '');
      if v_client_id is null then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_trip_name := coalesce(nullif(pg_catalog.btrim(v_elem->>'name'), ''), 'Untitled Ride');
      v_trip_tag := coalesce(nullif(pg_catalog.btrim(v_elem->>'tag'), ''), 'RIDE');

      v_dep_date := null;
      v_dep_date_text := nullif(pg_catalog.btrim(v_elem->>'departureDate'), '');
      if v_dep_date_text is not null and v_dep_date_text ~ '^\d{4}-\d{2}-\d{2}' then
        begin
          v_dep_date := pg_catalog.left(v_dep_date_text, 10)::date;
        exception when others then
          v_dep_date := null;
        end;
      end if;

      v_item_ts := v_default_client_ts;
      if nullif(pg_catalog.btrim(v_elem->>'updatedAt'), '') is not null then
        begin
          v_item_ts := (pg_catalog.btrim(v_elem->>'updatedAt'))::timestamptz;
        exception when others then
          v_item_ts := v_default_client_ts;
        end;
      end if;

      insert into public.user_trips (
        user_id,
        client_id,
        schema_version,
        name,
        tag,
        departure_date,
        payload,
        client_updated_at
      ) values (
        v_user_id,
        v_client_id,
        2,
        v_trip_name,
        v_trip_tag,
        v_dep_date,
        v_elem,
        v_item_ts
      )
      on conflict (user_id, client_id) do nothing;

      get diagnostics v_row_count = row_count;
      v_trips_inserted := v_trips_inserted + v_row_count;
    end loop;
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'ok',
    'profiles_inserted', v_profiles_inserted,
    'bikes_inserted', v_bikes_inserted,
    'trips_inserted', v_trips_inserted,
    'skipped', v_skipped
  );
end;
$$;

revoke all on function public.backfill_user_state_to_v2() from public, anon;
grant execute on function public.backfill_user_state_to_v2() to authenticated;
