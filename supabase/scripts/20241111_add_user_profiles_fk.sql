-- Link user_profiles to users via a real foreign key
-- Run manually (psql) or with supabase db remote commit/execute

BEGIN;

-- Step 1: add nullable column to allow backfill in place
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Step 2: copy matching ids using the existing display_name relationship
UPDATE public.user_profiles up
SET user_id = u.id
FROM public.users u
WHERE u.display_name = up.display_name
  AND up.user_id IS NULL;

-- Step 3: sanity check – abort if any profile still lacks user match
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce FK: some user_profiles have no matching users by display_name.';
  END IF;
END $$;

-- Step 4: make the column required and unique (1:1 relationship)
ALTER TABLE public.user_profiles
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);

-- Step 5: create the foreign key with cascade cleanup
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Optional: index to speed lookups by user
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

COMMIT;


