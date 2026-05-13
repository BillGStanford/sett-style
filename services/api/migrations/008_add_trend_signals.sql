-- Trend Signals: Daily aggregated metrics per aesthetic
-- Populated by workers/aggregate_trends.py daily cron

CREATE TABLE trend_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aesthetic       TEXT NOT NULL,
  metric_type     TEXT NOT NULL CHECK (metric_type IN ('saves', 'likes', 'searches', 'tags')),
  count           INTEGER NOT NULL DEFAULT 0,
  recorded_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  period          TEXT NOT NULL DEFAULT 'daily' CHECK (period IN ('daily', 'weekly', 'monthly')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trend_signals_aesthetic_date ON trend_signals(aesthetic, recorded_at DESC);
CREATE INDEX idx_trend_signals_period ON trend_signals(period);
CREATE UNIQUE INDEX idx_trend_signals_unique ON trend_signals(aesthetic, metric_type, recorded_at, period);