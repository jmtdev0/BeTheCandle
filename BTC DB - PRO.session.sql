-- =====================================================
-- BETHECANDLE - COMPLETE DATABASE SCHEMA
-- =====================================================

-- PASO 0: Limpiar tablas viejas si existen
DROP TABLE IF EXISTS user_payouts CASCADE;
DROP TABLE IF EXISTS payout_rounds CASCADE;
DROP TABLE IF EXISTS community_contributions CASCADE;
DROP TABLE IF EXISTS donation_totals CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Limpiar triggers viejos
DROP TRIGGER IF EXISTS trigger_update_donation_totals ON donations;
DROP FUNCTION IF EXISTS update_donation_totals() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 1. Tabla de perfiles de usuario extendidos
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT UNIQUE NOT NULL,
  preferred_name TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
  avatar_seed TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. Tabla de totales de donaciones (para ranking rápido)
CREATE TABLE IF NOT EXISTS donation_totals (
  display_name TEXT PRIMARY KEY,
  total_btc NUMERIC(16, 8) NOT NULL DEFAULT 0,
  donation_count INT NOT NULL DEFAULT 0,
  last_donation_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_totals_total_btc ON donation_totals(total_btc DESC);

-- Función para actualizar donation_totals automáticamente
CREATE OR REPLACE FUNCTION update_donation_totals()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO donation_totals (display_name, total_btc, donation_count, last_donation_at)
  VALUES (
    NEW.display_name,
    NEW.amount_btc,
    1,
    NEW.created_at
  )
  ON CONFLICT (display_name) DO UPDATE SET
    total_btc = donation_totals.total_btc + NEW.amount_btc,
    donation_count = donation_totals.donation_count + 1,
    last_donation_at = NEW.created_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en la tabla donations
DROP TRIGGER IF EXISTS trigger_update_donation_totals ON donations;
CREATE TRIGGER trigger_update_donation_totals
  AFTER INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donation_totals();

-- Poblar donation_totals con datos existentes
INSERT INTO donation_totals (display_name, total_btc, donation_count, last_donation_at)
SELECT 
  display_name,
  SUM(amount_btc) as total_btc,
  COUNT(*) as donation_count,
  MAX(created_at) as last_donation_at
FROM donations
GROUP BY display_name
ON CONFLICT (display_name) DO NOTHING;

-- 3. Tabla de contribuciones al Community Pot
CREATE TABLE IF NOT EXISTS community_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  amount_sats BIGINT NOT NULL CHECK (amount_sats > 0),
  lightning_invoice TEXT,
  lightning_invoice_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_contributions_display_name ON community_contributions(display_name);
CREATE INDEX IF NOT EXISTS idx_community_contributions_status ON community_contributions(status);
CREATE INDEX IF NOT EXISTS idx_community_contributions_created_at ON community_contributions(created_at DESC);

-- 4. Rondas de payout del Community Pot
CREATE TABLE IF NOT EXISTS payout_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_sats BIGINT NOT NULL,
  participant_count INT NOT NULL,
  sats_per_user BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_by TEXT,
  notes TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_rounds_status ON payout_rounds(status);
CREATE INDEX IF NOT EXISTS idx_payout_rounds_created_at ON payout_rounds(created_at DESC);

-- 5. Pagos individuales de cada ronda
CREATE TABLE IF NOT EXISTS user_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES payout_rounds(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  btc_address TEXT NOT NULL,
  amount_sats BIGINT NOT NULL,
  tx_hash TEXT,
  lightning_payment_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_payouts_round_id ON user_payouts(round_id);
CREATE INDEX IF NOT EXISTS idx_user_payouts_display_name ON user_payouts(display_name);
CREATE INDEX IF NOT EXISTS idx_user_payouts_status ON user_payouts(status);

-- Comentarios de documentación
COMMENT ON TABLE user_profiles IS 'Perfiles extendidos de usuarios con nombre preferido y enlaces sociales';
COMMENT ON TABLE donation_totals IS 'Totales agregados de donaciones por usuario (actualizado por trigger)';
COMMENT ON TABLE community_contributions IS 'Contribuciones diarias al Community Pot';
COMMENT ON TABLE payout_rounds IS 'Rondas de reparto del Community Pot';
COMMENT ON TABLE user_payouts IS 'Pagos individuales a usuarios en cada ronda';

-- Verificar que todo se creó correctamente
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

select * from pg_catalog.pg_tables
where schemaname NOT IN ('pg_catalog', 'information_schema');



SELECT json_agg(row_to_json(info))
FROM (
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
) AS info;
