create table if not exists public.shared_plans (
  code text primary key,
  payload_hash text not null unique,
  token text not null,
  title text not null default 'Cadence Ride Plan',
  summary text,
  distance_km numeric(7,1),
  elevation_m integer,
  stage_count integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint shared_plans_code_format check (code ~ '^[a-z0-9]{6,16}$'),
  constraint shared_plans_token_valid check (
    char_length(token) between 10 and 32768
    and token ~ '^[A-Za-z0-9_-]+$'
  ),
  constraint shared_plans_title_len check (char_length(title) <= 120),
  constraint shared_plans_summary_len check (summary is null or char_length(summary) <= 240),
  constraint shared_plans_stage_count_range check (stage_count between 1 and 60)
);

create index if not exists idx_shared_plans_created_by
  on public.shared_plans (created_by)
  where created_by is not null;

alter table public.shared_plans enable row level security;

revoke all on table public.shared_plans from public, anon, authenticated;

create or replace function public.create_shared_plan(
  p_token text,
  p_title text default null,
  p_summary text default null,
  p_distance_km numeric default null,
  p_elevation_m integer default null,
  p_stage_count integer default 1
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_token text;
  v_hash text;
  v_existing_code text;
  v_code text;
  v_alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  v_bytes bytea;
  v_i integer;
  v_attempt integer := 0;
  v_title text;
  v_summary text;
  v_distance_km numeric(7,1);
  v_elevation_m integer;
  v_stage_count integer;
begin
  v_clean_token := btrim(coalesce(p_token, ''));
  if char_length(v_clean_token) < 10 or char_length(v_clean_token) > 32768 then
    raise exception 'Invalid plan token length';
  end if;
  if v_clean_token !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid plan token characters';
  end if;

  v_hash := encode(pg_catalog.sha256(pg_catalog.convert_to(v_clean_token, 'UTF8')), 'hex');

  select s.code
    into v_existing_code
    from public.shared_plans as s
   where s.payload_hash = v_hash
   limit 1;

  if v_existing_code is not null then
    update public.shared_plans
       set expires_at = null
     where code = v_existing_code
       and expires_at is not null
       and expires_at <= now();
    return v_existing_code;
  end if;

  v_title := left(coalesce(nullif(btrim(p_title), ''), 'Cadence Ride Plan'), 120);
  v_summary := case
    when p_summary is null or btrim(p_summary) = '' then null
    else left(btrim(p_summary), 240)
  end;
  v_distance_km := case
    when p_distance_km is null or p_distance_km < 0 or p_distance_km > 99999 then null
    else round(p_distance_km::numeric, 1)
  end;
  v_elevation_m := case
    when p_elevation_m is null or p_elevation_m < 0 or p_elevation_m > 500000 then null
    else p_elevation_m
  end;
  v_stage_count := greatest(1, least(60, coalesce(p_stage_count, 1)));

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then
      raise exception 'Could not allocate unique short plan code';
    end if;

    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for v_i in 0..7 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, v_i) % length(v_alphabet)) + 1, 1);
    end loop;

    begin
      insert into public.shared_plans (
        code,
        payload_hash,
        token,
        title,
        summary,
        distance_km,
        elevation_m,
        stage_count,
        created_by
      ) values (
        v_code,
        v_hash,
        v_clean_token,
        v_title,
        v_summary,
        v_distance_km,
        v_elevation_m,
        v_stage_count,
        auth.uid()
      );
      return v_code;
    exception
      when unique_violation then
        select s.code
          into v_existing_code
          from public.shared_plans as s
         where s.payload_hash = v_hash
         limit 1;
        if v_existing_code is not null then
          return v_existing_code;
        end if;
    end;
  end loop;
end;
$$;

create or replace function public.get_shared_plan(p_code text)
returns table (
  code text,
  token text,
  title text,
  summary text,
  distance_km numeric,
  elevation_m integer,
  stage_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  v_code := lower(btrim(coalesce(p_code, '')));
  if v_code !~ '^[a-z0-9]{6,16}$' then
    return;
  end if;

  return query
    select
      s.code,
      s.token,
      s.title,
      s.summary,
      s.distance_km,
      s.elevation_m,
      s.stage_count,
      s.created_at
    from public.shared_plans as s
    where s.code = v_code
      and (s.expires_at is null or s.expires_at > now())
    limit 1;
end;
$$;

revoke all on function public.create_shared_plan(text, text, text, numeric, integer, integer) from public;
grant execute on function public.create_shared_plan(text, text, text, numeric, integer, integer) to anon, authenticated;

revoke all on function public.get_shared_plan(text) from public;
grant execute on function public.get_shared_plan(text) to anon, authenticated;
