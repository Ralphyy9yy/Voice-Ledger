CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE transactions(id TEXT PRIMARY KEY,idempotency_key TEXT NOT NULL UNIQUE,type TEXT NOT NULL CHECK(type IN ('sale','expense')),note TEXT,transcript TEXT,total_centavos INTEGER NOT NULL CHECK(total_centavos>=0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,voided_at TEXT);
CREATE TABLE line_items(id TEXT PRIMARY KEY,transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,name TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),unit_price_centavos INTEGER NOT NULL CHECK(unit_price_centavos>=0),line_total_centavos INTEGER NOT NULL CHECK(line_total_centavos>=0),position INTEGER NOT NULL);
CREATE TABLE audit_events(id TEXT PRIMARY KEY,transaction_id TEXT NOT NULL REFERENCES transactions(id),kind TEXT NOT NULL CHECK(kind IN ('corrected','voided')),reason TEXT NOT NULL,before_json TEXT NOT NULL,after_json TEXT,created_at TEXT NOT NULL);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_items_name ON line_items(name);
