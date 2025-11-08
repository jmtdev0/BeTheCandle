-- Añadir campos bio y btc_address a user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS btc_address TEXT;

-- Añadir constraints para validación
ALTER TABLE user_profiles
ADD CONSTRAINT bio_length_check CHECK (length(bio) <= 500),
ADD CONSTRAINT preferred_name_length_check CHECK (length(preferred_name) <= 32);

-- Índice para búsquedas por btc_address
CREATE INDEX IF NOT EXISTS idx_user_profiles_btc_address ON user_profiles(btc_address) WHERE btc_address IS NOT NULL;

-- Comentarios de documentación
COMMENT ON COLUMN user_profiles.bio IS 'Biografía o descripción del usuario (máx 500 caracteres)';
COMMENT ON COLUMN user_profiles.btc_address IS 'Dirección Bitcoin para recibir donaciones';
