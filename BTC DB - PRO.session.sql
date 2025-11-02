-- Core schema for realtime Bitcoin donation orbit
create extension if not exists "pgcrypto";

create table if not exists public.donations (
	id uuid primary key default gen_random_uuid(),
	display_name text not null,
	btc_address text not null,
	amount_btc numeric(20, 8) not null check (amount_btc > 0),
	message text,
	orbit_style text,
	created_at timestamptz not null default timezone('utc', now())
);

comment on table public.donations is 'Live donations powering the GoofySphere satellites';

create index if not exists donations_created_at_idx on public.donations (created_at desc);

alter table public.donations enable row level security;

-- Allow the public anon key to watch realtime events and list donations
do $$
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
		  and tablename = 'donations'
		  and policyname = 'donations_public_read'
	) then
		create policy "donations_public_read" on public.donations
			for select
			using (true);
	end if;
end$$;

-- Only the service role (via Next.js API) should insert/update/delete
do $$
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
		  and tablename = 'donations'
		  and policyname = 'donations_service_write'
	) then
		create policy "donations_service_write" on public.donations
			for all
			using (auth.role() = 'service_role')
			with check (auth.role() = 'service_role');
	end if;
end$$;

do $$
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
		  and schemaname = 'public'
		  and tablename = 'donations'
	) then
		alter publication supabase_realtime add table public.donations;
	end if;
end$$;
