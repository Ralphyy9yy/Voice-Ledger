# Architecture

VoiceLedger is an npm-workspace modular monolith. `apps/web` contains React feature modules, `apps/server` owns validation/business rules/persistence and serves production assets, and `packages/shared` owns API schemas.

## Transaction flow

1. MediaRecorder captures at most two minutes; typed input is always available.
2. Express bounds the upload, inspects magic bytes, converts it to mono 16 kHz PCM with FFmpeg argument arrays, and calls whisper.cpp without a shell.
3. The user corrects the transcript.
4. A fixed loopback Ollama endpoint receives an extraction-only prompt and JSON schema. It has no tools, SQL, or filesystem access. Transcript instructions are explicitly untrusted.
5. Zod validates model output. Missing fields and ambiguities remain visible; no confidence percentage is invented.
6. The editable form is the authority presented to the user. Manual draft entry works without Ollama.
7. Explicit confirmation sends an idempotency UUID. Server code validates positive integer quantities, parses centavos, recomputes every line and total, checks any stated total, and commits header/items in one SQLite transaction.

AI providers implement small speech/extraction interfaces. AI never writes the database. The local/cloud boundary is strict: browser and loopback processes only; there are no cloud services, fonts, analytics, or CDN assets.

SQLite uses foreign keys, WAL, prepared statements, UTC timestamps, and versioned SQL migrations. Corrections retain before/after JSON; voids retain the original record. Daily reporting converts UTC to fixed UTC+8, valid for Asia/Manila (which has no daylight saving time). Backups use SQLite's online backup API so WAL state is consistent.

Mutation requests require a custom CSRF header and a permitted Origin when present. Host and Origin allowlists, Helmet, body limits, fixed provider URLs, subprocess arrays, timeouts, bounded outputs, and temporary cleanup reduce localhost attack surface. This is defense in depth, not a substitute for authentication if deployed beyond one trusted OS user.
