--
-- PostgreSQL database dump
--
\restrict db4bvxwv0ehN4VkmAeh0aAvRrKJWU0l4v40orAW7A5lsAAlYCcV6mOgdrk6vZ8t

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: get-hello-table(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public."get-hello-table"() RETURNS character varying
    LANGUAGE sql
    AS $$SELECT * FROM hello_table$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    display_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    last_seen_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Application users keyed by cookie-based UUIDs.';


--
-- Name: COLUMN users.display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.display_name IS 'Public display name used across the experience.';


--
-- Name: COLUMN users.last_seen_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_seen_at IS 'Timestamp of the user''s most recent activity.';


--
-- Name: register_user_profile(uuid, text, text, text, jsonb, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_user_profile(p_user_id uuid, p_display_name text, p_preferred_name text DEFAULT NULL::text, p_bio text DEFAULT NULL::text, p_social_links jsonb DEFAULT '[]'::jsonb, p_btc_address text DEFAULT NULL::text, p_orbit_speed_multiplier numeric DEFAULT 1.0, p_satellite_color text DEFAULT NULL::text) RETURNS public.users
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user users%rowtype;
  v_speed numeric;
  v_color text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'p_display_name is required';
  end if;

  v_speed := coalesce(p_orbit_speed_multiplier, 1.0);
  v_speed := least(greatest(v_speed, 0.1), 3.0);

  v_color := coalesce(nullif(trim(p_satellite_color), ''), '#F97316');

  -- Upsert the base user record
  insert into users (id, display_name, last_seen_at)
  values (p_user_id, p_display_name, timezone('utc', now()))
  on conflict (id) do update
    set display_name = excluded.display_name,
        last_seen_at = timezone('utc', now())
  returning * into v_user;

  -- Upsert the profile tied to this user id
  update user_profiles
    set user_id = v_user.id
  where display_name = p_display_name
    and (user_id is distinct from v_user.id or user_id is null);

  insert into user_profiles (
    user_id,
    display_name,
    preferred_name,
    bio,
    social_links,
    btc_address,
    orbit_speed_multiplier,
    avatar_seed,
    satellite_color,
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
    v_color,
    timezone('utc', now())
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        preferred_name = excluded.preferred_name,
        bio = excluded.bio,
        social_links = excluded.social_links,
        btc_address = excluded.btc_address,
        orbit_speed_multiplier = excluded.orbit_speed_multiplier,
        avatar_seed = excluded.avatar_seed,
        satellite_color = excluded.satellite_color,
        updated_at = timezone('utc', now());

  return v_user;
end;
$$;


--
-- Name: hello_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hello_table (
    text character varying NOT NULL
);


--
-- Name: TABLE hello_table; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hello_table IS 'Una tabla saludable';


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_name text NOT NULL,
    preferred_name text,
    social_links jsonb DEFAULT '[]'::jsonb,
    avatar_seed text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    bio text,
    btc_address text,
    orbit_speed_multiplier real DEFAULT 1.0,
    user_id uuid NOT NULL,
    satellite_color text DEFAULT '#F97316'::text,
    CONSTRAINT bio_length_check CHECK ((length(bio) <= 500)),
    CONSTRAINT orbit_speed_multiplier_range_check CHECK (((orbit_speed_multiplier >= (0.1)::double precision) AND (orbit_speed_multiplier <= (3.0)::double precision))),
    CONSTRAINT preferred_name_length_check CHECK ((length(preferred_name) <= 32))
);


--
-- Name: TABLE user_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_profiles IS 'Perfiles extendidos de usuarios con nombre preferido y enlaces sociales';


--
-- Name: COLUMN user_profiles.bio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.bio IS 'Biografía o descripción del usuario (máx 500 caracteres)';


--
-- Name: COLUMN user_profiles.btc_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.btc_address IS 'Dirección Bitcoin para recibir donaciones';


--
-- Name: COLUMN user_profiles.satellite_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.satellite_color IS 'Hex color used for the user''s satellite in the lobby';


--
-- Data for Name: hello_table; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hello_table (text) FROM stdin;
Hoooooola, buenas a todos, guapísimossssss
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, display_name, preferred_name, social_links, avatar_seed, created_at, updated_at, bio, btc_address, orbit_speed_multiplier, user_id, satellite_color) FROM stdin;
2b537660-752e-4a37-b420-0ff448d62fbf	Visitor 217ab8	Paco Mobile	[]	Visitor 217ab8	2025-11-11 21:48:48.708333+00	2025-11-11 21:48:48.708333+00			1.1	217ab8d0-a424-4e6c-b481-b21de010050b	#F97316
8061b8b0-6714-4a91-9262-bfbdf8b92fbb	Visitor be105f		[{"url": "https://buymeacoffee.com/jmtdev", "platform": "BuyMeACoffee"}]	Visitor be105f	2025-11-11 21:41:17.173265+00	2025-11-12 21:04:17.656562+00	Soy un satélite bastante pobre.		1	be105f85-6e5a-4be5-9359-82fd765999e6	#823CD7
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, display_name, created_at, last_seen_at) FROM stdin;
217ab8d0-a424-4e6c-b481-b21de010050b	Visitor 217ab8	2025-11-11 21:48:48.708333+00	2025-11-11 21:48:48.708333+00
be105f85-6e5a-4be5-9359-82fd765999e6	Visitor be105f	2025-11-11 21:41:17.173265+00	2025-11-12 21:04:17.656562+00
\.


--
-- Name: user_profiles user_profiles_display_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_display_name_key UNIQUE (display_name);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: users users_display_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_display_name_key UNIQUE (display_name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_user_profiles_btc_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_btc_address ON public.user_profiles USING btree (btc_address) WHERE (btc_address IS NOT NULL);


--
-- Name: idx_user_profiles_display_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_display_name ON public.user_profiles USING btree (display_name);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_users_display_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_display_name ON public.users USING btree (display_name);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: hello_table; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hello_table ENABLE ROW LEVEL SECURITY;


--
-- Name: community_pot_weeks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_pot_weeks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_label text NOT NULL UNIQUE,
    week_start_at timestamp with time zone NOT NULL,
    distribution_at timestamp with time zone NOT NULL,
    amount_usdc numeric(12,2) NOT NULL DEFAULT 10.00,
    max_participants integer NOT NULL DEFAULT 10 CHECK (max_participants > 0),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'closed')),
    executed_at timestamp with time zone,
    executed_tx_hash text,
    execution_error text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

--
-- Name: community_pot_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_pot_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id uuid NOT NULL REFERENCES public.community_pot_weeks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    polygon_address text NOT NULL CHECK (polygon_address ~ '^0x[0-9a-fA-F]{40}$'),
    joined_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT community_pot_participants_user_week_key UNIQUE (week_id, user_id),
    CONSTRAINT community_pot_participants_address_week_key UNIQUE (week_id, polygon_address)
);

--
-- Name: community_pot_payout_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_pot_payout_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id uuid NOT NULL REFERENCES public.community_pot_weeks(id) ON DELETE CASCADE,
    executed_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    total_amount_usdc numeric(12,2) NOT NULL,
    participant_count integer NOT NULL,
    per_participant_amount_usdc numeric(12,6) NOT NULL,
    transaction_hash text,
    transaction_url text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

--
-- Name: community_pot_weeks_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.community_pot_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_pot_weeks_set_updated_at
BEFORE UPDATE ON public.community_pot_weeks
FOR EACH ROW
EXECUTE FUNCTION public.community_pot_touch_updated_at();

--
-- Name: community_pot_participants_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.community_pot_normalize_address()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.polygon_address := lower(NEW.polygon_address);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_pot_enforce_participant_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_max integer;
  v_status text;
  v_count integer;
BEGIN
  SELECT max_participants, status
    INTO v_max, v_status
    FROM public.community_pot_weeks
   WHERE id = NEW.week_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community pot week % does not exist', NEW.week_id;
  END IF;

  IF TG_OP = 'INSERT' AND v_status <> 'open' THEN
    RAISE EXCEPTION 'Community pot week % is no longer open for new participants', NEW.week_id;
  END IF;

  SELECT count(*)
    INTO v_count
    FROM public.community_pot_participants
   WHERE week_id = NEW.week_id;

  IF TG_OP = 'INSERT' THEN
    v_count := v_count + 1;
  END IF;

  IF v_count > v_max THEN
    RAISE EXCEPTION 'Community pot week % is full (%/% participants)', NEW.week_id, v_count, v_max;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER community_pot_participants_limit
BEFORE INSERT OR UPDATE ON public.community_pot_participants
FOR EACH ROW
EXECUTE FUNCTION public.community_pot_enforce_participant_limit();

CREATE TRIGGER community_pot_participants_normalize
BEFORE INSERT OR UPDATE ON public.community_pot_participants
FOR EACH ROW
EXECUTE FUNCTION public.community_pot_normalize_address();

--
-- Name: community_pot_payout_logs policies; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.community_pot_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pot_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pot_payout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_pot_weeks_select
  ON public.community_pot_weeks
  FOR SELECT
  USING (true);

CREATE POLICY community_pot_participants_select_self
  ON public.community_pot_participants
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY community_pot_participants_modify_self
  ON public.community_pot_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY community_pot_participants_update_self
  ON public.community_pot_participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY community_pot_payout_logs_select
  ON public.community_pot_payout_logs
  FOR SELECT
  USING (true);

--
-- Name: community_pot_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_pot_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL,
    description text,
    amount_usdc numeric(12,2) NOT NULL CHECK (amount_usdc > 0),
    max_participants integer NOT NULL CHECK (max_participants > 0),
    min_participants integer NOT NULL DEFAULT 1 CHECK (min_participants > 0),
    per_wallet_cap_usdc numeric(12,2) DEFAULT NULL,
    weekday integer NOT NULL DEFAULT 7 CHECK (weekday BETWEEN 1 AND 7),
    payout_hour integer NOT NULL DEFAULT 16 CHECK (payout_hour BETWEEN 0 AND 23),
    payout_minute integer NOT NULL DEFAULT 30 CHECK (payout_minute BETWEEN 0 AND 59),
    timezone text NOT NULL DEFAULT 'Europe/Berlin',
    active_from timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    active_to timestamp with time zone,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX idx_community_pot_rules_default
  ON public.community_pot_rules (is_default)
  WHERE is_default;

--
-- Name: community_pot_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_pot_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id uuid NOT NULL REFERENCES public.community_pot_rules(id),
    week_id uuid REFERENCES public.community_pot_weeks(id),
    label text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    created_from timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','processing','paid','failed')),
    total_amount_usdc numeric(12,2) NOT NULL,
    total_sent_usdc numeric(12,2) DEFAULT 0,
    participant_count integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    executed_at timestamp with time zone,
    failure_reason text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

--
-- Name: community_pot_payout_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_pot_payout_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id uuid NOT NULL REFERENCES public.community_pot_payouts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    polygon_address text NOT NULL CHECK (polygon_address ~ '^0x[0-9a-fA-F]{40}$'),
    amount_usdc numeric(12,6) NOT NULL,
    amount_units numeric(18,0) NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
    tx_hash text,
    joined_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(payout_id, user_id)
);

--
-- Name: community_pot_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_pot_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id uuid NOT NULL REFERENCES public.community_pot_payouts(id) ON DELETE CASCADE,
    participant_id uuid REFERENCES public.community_pot_payout_participants(id) ON DELETE SET NULL,
    tx_hash text NOT NULL,
    amount_units numeric(18,0) NOT NULL,
    gas_paid_wei numeric(38,0),
    chain_id bigint DEFAULT 137,
    status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','confirmed','failed')),
    block_number bigint,
    explorer_url text,
    submitted_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    confirmed_at timestamp with time zone
);

--
-- Name: community_pot_payout_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_pot_payout_conditions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id uuid NOT NULL REFERENCES public.community_pot_payouts(id) ON DELETE CASCADE,
    key text NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

--
-- Name: community_pot_set_updated_at; Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.community_pot_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_pot_rules_set_updated_at
BEFORE UPDATE ON public.community_pot_rules
FOR EACH ROW
EXECUTE FUNCTION public.community_pot_set_updated_at();

CREATE TRIGGER community_pot_payouts_set_updated_at
BEFORE UPDATE ON public.community_pot_payouts
FOR EACH ROW
EXECUTE FUNCTION public.community_pot_set_updated_at();

--
-- Name: community_pot_get_active_rule; Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.community_pot_get_active_rule()
RETURNS public.community_pot_rules
LANGUAGE sql
AS $$
  SELECT * FROM public.community_pot_rules
   WHERE active_from <= timezone('utc', now())
     AND (active_to IS NULL OR active_to >= timezone('utc', now()))
   ORDER BY is_default DESC, active_from DESC
   LIMIT 1;
$$;

--
-- Name: community_pot_schedule_next_payout; Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.community_pot_schedule_next_payout()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule public.community_pot_rules;
  v_week public.community_pot_weeks;
  v_payout_id uuid;
BEGIN
  SELECT * INTO v_rule FROM public.community_pot_get_active_rule();
  IF v_rule.id IS NULL THEN
    RAISE EXCEPTION 'No active community pot rule found';
  END IF;

  SELECT * INTO v_week FROM public.community_pot_weeks
   WHERE status <> 'paid'
   ORDER BY distribution_at ASC
   LIMIT 1;

  INSERT INTO public.community_pot_payouts (
    rule_id,
    week_id,
    label,
    scheduled_at,
    status,
    total_amount_usdc
  ) VALUES (
    v_rule.id,
    v_week.id,
    COALESCE(v_week.week_label, to_char(timezone(v_rule.timezone, now()), 'IYYY-IW')),
    v_week.distribution_at,
    'scheduled',
    v_rule.amount_usdc
  ) RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;

--
-- Name: community_pot_snapshot_participants; Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.community_pot_snapshot_participants(p_payout_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_id uuid;
  v_count integer;
BEGIN
  SELECT week_id INTO v_week_id FROM public.community_pot_payouts WHERE id = p_payout_id;
  IF v_week_id IS NULL THEN
    RAISE EXCEPTION 'Invalid payout id %', p_payout_id;
  END IF;

  INSERT INTO public.community_pot_payout_participants (payout_id, user_id, polygon_address, amount_usdc, amount_units)
  SELECT p_payout_id,
         cpp.user_id,
         cpp.polygon_address,
         0,
         0
    FROM public.community_pot_participants cpp
   WHERE cpp.week_id = v_week_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = row_count;
  RETURN v_count;
END;
$$;

--
-- Name: community_pot_policies; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.community_pot_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pot_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pot_payout_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pot_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pot_payout_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_pot_rules_read
  ON public.community_pot_rules
  FOR SELECT
  USING (true);

CREATE POLICY community_pot_payouts_read
  ON public.community_pot_payouts
  FOR SELECT
  USING (true);

CREATE POLICY community_pot_payout_participants_user_read
  ON public.community_pot_payout_participants
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY community_pot_transactions_read
  ON public.community_pot_transactions
  FOR SELECT
  USING (true);

CREATE POLICY community_pot_payout_conditions_read
  ON public.community_pot_payout_conditions
  FOR SELECT
  USING (true);
--
-- PostgreSQL database dump complete
--

\unrestrict db4bvxwv0ehN4VkmAeh0aAvRrKJWU0l4v40orAW7A5lsAAlYCcV6mOgdrk6vZ8t

/* Vamos a darle un cierto meneo a las tablas, porque hay unas cuantas
-- que me sobran o que no entiendo muy bien para qué están ahí.

-- Lo que quiero es que tengamos una tabla para reparto, otra para los participantes de cada reparto,
otra para las condiciones de cada reparto, otra para las transacciones realizadas, y otra genérica de logs.

*/

-- Ya he borrado todas. Empezamos de cero.
-- La tabla community_pot_payouts será la tabla principal de los repartos.
CREATE TABLE community_pot_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabla de participantes en cada payout. En esta tabla tendremos una referencia al payout,
-- la dirección polygon y cuándo se unió.
-- Su clave primaria será la unión de payout_id y la dirección polygon.
CREATE TABLE community_pot_payout_participants (
    payout_id uuid REFERENCES community_pot_payouts(id) ON DELETE CASCADE,
    polygon_address text NOT NULL,
    joined_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    PRIMARY KEY (payout_id, polygon_address)
);

-- Tabla de condiciones para cada payout. 
-- En ella, indicaremos el importe en USDC del reparto, el momento en el que está planificado,
-- si es mainnet o testnet y el número de participantes posible.
CREATE TABLE community_pot_payout_conditions (
    payout_id uuid REFERENCES community_pot_payouts(id) ON DELETE CASCADE,
    amount_usdc numeric(12,2) NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    is_testnet boolean NOT NULL DEFAULT false,
    max_participants integer NOT NULL,
    PRIMARY KEY (payout_id)
);


-- Tabla de transacciones realizadas para cada payout.
CREATE TABLE community_pot_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id uuid REFERENCES community_pot_payouts(id) ON DELETE CASCADE,
    tx_hash text NOT NULL,
    amount_units numeric(18,0) NOT NULL,
    gas_paid_wei numeric(38,0),
    chain_id bigint DEFAULT 137,
    status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','confirmed','failed')),
    block_number bigint,
    explorer_url text,
    submitted_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    confirmed_at timestamp with time zone
);

-- Por último, una tabla de logs genérica para cada payout, para poder apuntar cosillas.
CREATE TABLE community_pot_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    log_time timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    log_from text NOT NULL,
    message text NOT NULL
);

-- Vamos a añadir una columna FK (payout_id) a community_pot_logs

-- También vamos a añadir una referencia al participante que ha recibido la transacción en el reparto
ALTER TABLE community_pot_transactions
    ADD COLUMN participant_id uuid,
    ADD CONSTRAINT fk_participant
      FOREIGN KEY(participant_id)
      REFERENCES community_pot_payout_participants(payout_id)
      ON DELETE SET NULL;

-- Crear tabla que almacenará valores de configuración estándar de los repartos
CREATE TABLE community_pot_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL,
    description text,
    value INTEGER NOT NULL
);

-- Cambiamos un poco el enfoque. Vamos a tener un registro que sirva como un reparto de ejemplo.COMMENT
-- La fecha por defecto es el domingo a las 4:30 pm CET
ALTER TABLE community_pot_payout_default_config
    ADD COLUMN is_testnet boolean NOT NULL DEFAULT false,
    ADD COLUMN max_participants integer NOT NULL DEFAULT 10,
    ADD COLUMN scheduled_at timestamp with time zone NOT NULL DEFAULT (
        date_trunc('week', timezone('Europe/Berlin', now())) + interval '6 days' + interval '16 hours' + interval '30 minutes'
    ),
    ADD COLUMN amount_usdc numeric(10,6) NOT NULL DEFAULT 10.00;
    
-- La planificación la vamos a configurar así mejor:
-- schedule_weekday: 7
-- schedule_time: "16:30"
-- schedule_timezone: "CET"
ALTER TABLE community_pot_payout_default_config
    ADD COLUMN schedule_weekday integer NOT NULL DEFAULT 7 CHECK (schedule_weekday BETWEEN 1 AND 7),
    ADD COLUMN schedule_time text NOT NULL DEFAULT '16:30',
    ADD COLUMN schedule_timezone text NOT NULL DEFAULT 'Europe/Berlin';

  
-- Vamos a añadir una columna a community_pot_payouts para guardar la hora verdadera en la que se ha ejecutado el payout
ALTER TABLE community_pot_payouts
    ADD COLUMN executed_at timestamp with time zone;
      