-- Tabla de perfiles de usuario extendidos
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT UNIQUE NOT NULL,
  preferred_name TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
  avatar_seed TEXT, -- Seed para generar avatar consistente con Dicebear
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por display_name
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios de documentación
COMMENT ON TABLE user_profiles IS 'Perfiles extendidos de usuarios con nombre preferido y enlaces sociales';
COMMENT ON COLUMN user_profiles.preferred_name IS 'Nombre de usuario preferido (máx 32 caracteres)';
COMMENT ON COLUMN user_profiles.social_links IS 'Array de objetos con {platform: string, url: string}';
COMMENT ON COLUMN user_profiles.avatar_seed IS 'Seed para generar avatar consistente (ej: display_name hash)';
