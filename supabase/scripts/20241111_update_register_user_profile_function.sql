-- Refresh register_user_profile to work with the new user_id foreign key
-- Run after applying 20241111_add_user_profiles_fk.sql

create or replace function public.register_user_profile(
  p_user_id uuid,
  p_display_name text,
  p_preferred_name text default null,
  p_bio text default null,
  p_social_links jsonb default '[]'::jsonb,
  p_btc_address text default null,
  p_orbit_speed_multiplier numeric default 1.0
)
returns public.users
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_user users%rowtype;
  v_speed numeric;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'p_display_name is required';
  end if;

  v_speed := coalesce(p_orbit_speed_multiplier, 1.0);
  v_speed := least(greatest(v_speed, 0.1), 3.0);

  -- Upsert the base user record
  insert into users (id, display_name, last_seen_at)
  values (p_user_id, p_display_name, timezone('utc', now()))
  on conflict (id) do update
    set display_name = excluded.display_name,
        last_seen_at = timezone('utc', now())
  returning * into v_user;

  -- Upsert the profile tied to this user id
  insert into user_profiles (
    user_id,
    display_name,
    preferred_name,
    bio,
    social_links,
    btc_address,
    orbit_speed_multiplier,
    avatar_seed,
    updated_at
  )
  values (
    v_user.id,
    v_user.display_name,
    p_preferred_name,
    p_bio,
    coalesce(p_social_links, '[]'::jsonb),
    p_btc_address,
    v_speed,
    coalesce(v_user.display_name, p_display_name),
    timezone('utc', now())
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        preferred_name = excluded.preferred_name,
        bio = excluded.bio,
        social_links = excluded.social_links,
        btc_address = excluded.btc_address,
        orbit_speed_multiplier = excluded.orbit_speed_multiplier,
        updated_at = timezone('utc', now());

  return v_user;
end;
$$;

grant execute on function public.register_user_profile(uuid, text, text, text, jsonb, text, numeric) to anon;
grant execute on function public.register_user_profile(uuid, text, text, text, jsonb, text, numeric) to authenticated;
grant execute on function public.register_user_profile(uuid, text, text, text, jsonb, text, numeric) to service_role;
