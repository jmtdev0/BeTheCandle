-- Tabla de contribuciones al Community Pot
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

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_community_contributions_display_name ON community_contributions(display_name);
CREATE INDEX IF NOT EXISTS idx_community_contributions_status ON community_contributions(status);
CREATE INDEX IF NOT EXISTS idx_community_contributions_created_at ON community_contributions(created_at DESC);

-- Rondas de payout del Community Pot
CREATE TABLE IF NOT EXISTS payout_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_sats BIGINT NOT NULL,
  participant_count INT NOT NULL,
  sats_per_user BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_by TEXT, -- user_id del admin que procesó
  notes TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos individuales de cada ronda
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

-- Índices para user_payouts
CREATE INDEX IF NOT EXISTS idx_user_payouts_round_id ON user_payouts(round_id);
CREATE INDEX IF NOT EXISTS idx_user_payouts_display_name ON user_payouts(display_name);
CREATE INDEX IF NOT EXISTS idx_user_payouts_status ON user_payouts(status);

-- Comentarios de documentación
COMMENT ON TABLE community_contributions IS 'Contribuciones diarias al bote comunitario';
COMMENT ON TABLE payout_rounds IS 'Rondas de reparto del Community Pot';
COMMENT ON TABLE user_payouts IS 'Pagos individuales a usuarios en cada ronda';
