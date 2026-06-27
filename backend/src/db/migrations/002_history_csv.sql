-- Store the generated CSV with each history row so it can be re-downloaded for
-- a limited window (4 hours). After expiry a cleanup nulls the csv to reclaim
-- space; the row (counts + date) stays for the record.
ALTER TABLE history ADD COLUMN csv TEXT;
ALTER TABLE history ADD COLUMN csv_expires_at TEXT;
