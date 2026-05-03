-- RENA-183: BNA exchange rate daily snapshots
-- No RLS — system-level table shared across tenants (like plan/plan_feature)

CREATE TABLE IF NOT EXISTS bna_rate (
  date        DATE PRIMARY KEY,
  buy_rate    NUMERIC(10,4) NOT NULL,
  sell_rate   NUMERIC(10,4) NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bna_rate_date_desc ON bna_rate (date DESC);

COMMENT ON TABLE bna_rate IS 'Daily BNA (Banco Nación) official exchange rate snapshots for ARS/USD billing';
COMMENT ON COLUMN bna_rate.buy_rate IS 'BNA compra (buy) rate ARS per 1 USD';
COMMENT ON COLUMN bna_rate.sell_rate IS 'BNA venta (sell) rate ARS per 1 USD — used for billing';
