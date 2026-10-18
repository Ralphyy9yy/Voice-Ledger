CREATE TABLE cash_closings (
 date TEXT PRIMARY KEY,
 opening_centavos INTEGER NOT NULL,
 actual_centavos INTEGER NOT NULL,
 expected_centavos INTEGER NOT NULL,
 sales_centavos INTEGER NOT NULL,
 expenses_centavos INTEGER NOT NULL,
 transaction_count INTEGER NOT NULL,
 ledger_version TEXT NOT NULL,
 note TEXT NOT NULL,
 closed_at TEXT NOT NULL
);
