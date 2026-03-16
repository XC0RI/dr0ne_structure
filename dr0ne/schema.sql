-- Run this once to initialize the D1 database:
-- wrangler d1 execute dr0ne_db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS images (
  id          TEXT    PRIMARY KEY,
  uploaded_at TEXT    NOT NULL,
  r2_key      TEXT    NOT NULL UNIQUE,
  date        TEXT    NOT NULL DEFAULT '-',
  made_by     TEXT    NOT NULL DEFAULT '-',
  made_by2    TEXT    NOT NULL DEFAULT '-',
  type        TEXT    NOT NULL DEFAULT '-',
  first_pub   TEXT    NOT NULL DEFAULT '-',
  title       TEXT    NOT NULL DEFAULT '-',
  location    TEXT    NOT NULL DEFAULT '-',
  txt         TEXT    NOT NULL DEFAULT '-'
);

CREATE INDEX IF NOT EXISTS idx_uploaded_at ON images(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_date        ON images(date);
CREATE INDEX IF NOT EXISTS idx_made_by     ON images(made_by);
CREATE INDEX IF NOT EXISTS idx_type        ON images(type);
CREATE INDEX IF NOT EXISTS idx_title       ON images(title);
CREATE INDEX IF NOT EXISTS idx_location    ON images(location);
