-- One-time migration to add the "project" category to an existing database
-- without re-uploading any images. Every existing row keeps its data and
-- gets the default value '-' for the new column automatically.
--
-- Run once:
--   wrangler d1 execute dr0ne_db --remote --file=migration_add_project.sql

ALTER TABLE images ADD COLUMN project TEXT NOT NULL DEFAULT '-';

CREATE INDEX IF NOT EXISTS idx_project ON images(project);
