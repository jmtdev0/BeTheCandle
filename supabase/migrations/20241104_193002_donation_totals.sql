-- Tabla agregada de totales de donaciones (para ranking rápido)
CREATE TABLE IF NOT EXISTS donation_totals (
  display_name TEXT PRIMARY KEY,
  total_btc NUMERIC(16, 8) NOT NULL DEFAULT 0,
  donation_count INT NOT NULL DEFAULT 0,
  last_donation_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para ordenar por total
CREATE INDEX IF NOT EXISTS idx_donation_totals_total_btc ON donation_totals(total_btc DESC);

-- Función para actualizar donation_totals cuando hay una nueva donación
CREATE OR REPLACE FUNCTION update_donation_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar o actualizar el total del usuario
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

-- Trigger que se ejecuta después de cada INSERT en donations
CREATE TRIGGER trigger_update_donation_totals
  AFTER INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donation_totals();

-- Poblar la tabla con datos existentes (ejecutar una vez)
INSERT INTO donation_totals (display_name, total_btc, donation_count, last_donation_at)
SELECT 
  display_name,
  SUM(amount_btc) as total_btc,
  COUNT(*) as donation_count,
  MAX(created_at) as last_donation_at
FROM donations
GROUP BY display_name
ON CONFLICT (display_name) DO NOTHING;

COMMENT ON TABLE donation_totals IS 'Totales agregados de donaciones por usuario (actualizado por trigger)';
