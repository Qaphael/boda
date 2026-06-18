ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_riders_deleted ON riders(is_deleted);
