-- Independent BAM alliance data. Does not reference raid targets.
CREATE TABLE IF NOT EXISTS app_state (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 version INTEGER NOT NULL,
 data_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_limits (
 ip_hash TEXT PRIMARY KEY,
 failures INTEGER NOT NULL,
 window_start INTEGER NOT NULL,
 locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 changed_at_kst TEXT NOT NULL,
 slot_number INTEGER NOT NULL,
 before_json TEXT NOT NULL,
 after_json TEXT NOT NULL
);
