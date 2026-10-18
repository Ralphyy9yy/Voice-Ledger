# Local production operation

VoiceLedger supports one trusted operating-system user on one computer. It has no account system or network sharing. Startup enforces loopback binding and local Ollama access. This release is not for public hosting, shared terminals, taxes, or unpaid/credit accounting. AI output always needs human review.

## Install and start

Use a supported Node.js version (22 or 24) and the committed npm lockfile. Preserve an existing `.env`; copy `.env.example` only on a new installation.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Open http://127.0.0.1:4310. `npm start` sets production mode automatically and serves the built frontend and API together. Close the development server before starting production on the same port. Press Ctrl+C to shut down gracefully.

After building, run `npm.cmd run doctor` to check the Node version, build files, local-only configuration, existing ledger integrity, and local AI setup. It does not start a server, save transactions, or prove recording accuracy. Missing AI services do not block manual entry.

## Unfinished entry recovery

Typed descriptions, reviewed transcripts, edited draft fields, and the original confirmation key are saved in this browser's local storage. Reopen Add transaction and choose Resume entry, Discard, or Start a new entry. Resuming never submits automatically; review and confirm again. Recovery copies are removed after successful confirmation. Preserving the confirmation key prevents duplicate saving when a previous confirmation succeeded but its response was lost.

Audio, an in-progress recording, and the AI's review-acknowledgement checkbox are not recovered. Browser data clearing, private browsing, storage restrictions, or changing browser/origin may make recovery unavailable. Recovery copies are not encrypted or included in SQLite backups. A failed recovery save displays a warning: keep the page open until confirmation. Distinct new entries use separate recovery keys; avoid simultaneously editing the same resumed entry in multiple tabs.

Shell environment variables take precedence over `.env`. To remove a stale override, use `Remove-Item Env:FFMPEG_PATH` (only if it exists), or restart the terminal. Do not bind the server to a LAN or configure Ollama with a remote URL.

## Verify a release

```powershell
npm.cmd run check
npm.cmd audit --omit=dev
```

Browser tests use a temporary database outside your ledger. They cover desktop and narrow screens, manual saving, incomplete AI drafts, AI errors, and recording with a simulated microphone. Their AI responses are fixtures: they do not prove real model accuracy or real microphone quality.

Before using new hardware or changing a model, record a short English and Filipino sample, compare the transcript with what you said, and check every amount in the draft. Test a clear sale, expense, and a statement with a missing price. Never save test transactions into a working ledger without clearly marking them or voiding them afterward.

Recording preferences include major Philippine language choices and an Other Philippine language option. Only English and Filipino / Tagalog use dedicated Whisper language codes in this app. All regional choices use `auto`, not unsupported codes. They are experimental preferences, not a guarantee of recognition or translation. The language list is not exhaustive. The model may produce another language or incorrect amounts; correct the transcript or use manual entry. These limitations follow the [Whisper language-token list](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py). Local AI drafting also has no verified accuracy guarantee for every Philippine language.

## Backups and recovery

Production startup creates an integrity-checked SQLite backup if today's backup is absent; an hourly check creates the next day's backup while the app remains open. Backups are in the `backups` directory beside the active database (normally `data/backups`). Settings can create and download a verified backup at any time.

Copy backups to another drive regularly. Local backups alone do not protect against disk failure. Backups contain transcripts and audit history and are not encrypted. They are retained until you remove them; monitor available disk space. CSV includes every active transaction but does not include voided entries or full audit history, and is not a substitute for a database backup.

Recovery always creates a new file and refuses to overwrite any existing database:

```powershell
npm.cmd run backup:restore -- "C:\VoiceLedger\data\backups\YOUR-BACKUP.db" "C:\VoiceLedger\data\recovered.db"
```

The command verifies database integrity and required tables before and after copying. Stop VoiceLedger, set `DATABASE_PATH=./data/recovered.db` in `.env`, ensure your shell has no `DATABASE_PATH` override, then restart. Confirm transactions and audit history in the restored ledger. Keep the original database until recovery is confirmed. Do not copy an active `.db` file by itself: WAL data may be missing. Use verified backups instead.

To check a downloaded backup without replacing anything:

```powershell
npm.cmd run backup:verify -- "C:\path\to\your-backup.db"
```

For a recovery rehearsal, run `backup:restore` with a new test destination, verify the recovered file, and keep the active `DATABASE_PATH` unchanged. Backups become available to download only after integrity checking completes.

## Updates and troubleshooting

Before an update, create and download a verified backup, stop the server, then install/build/start. Do not run demo seeding on your working ledger. Retain the previous release and backup for recovery. Database migrations are transactional; future destructive migrations require an explicit migration and rollback plan.

Settings checks Ollama's installed model and the FFmpeg executable. The Whisper paths are checked for existence; a real recording verifies model compatibility. Manual entry works when either AI service is down. An `AI_BUSY` response means another inference job is running; wait and retry. Timeout errors suggest trying a shorter recording or manual entry. An invalid AI draft identifies rejected fields rather than pretending the service is offline.

The API assigns a request ID to each response and logs unexpected failure codes without logging transcripts. Check the server terminal for startup, port, disk-space, and backup errors. Financial data is protected by integer-centavo validation, confirmation idempotency, stale-edit checks, SQLite transactions, and correction/void audit history. These controls do not guarantee the AI understood a spoken amount: final review remains mandatory.
# Daily cash closing

Reports includes a daily cash closing form, using Manila dates. Enter opening cash and actual counted cash; expected cash is opening cash plus active sales minus active expenses. This assumes all entries are cash. Credit, transfers, deposits, and withdrawals are not separate payment types yet.

One permanent snapshot is saved per date, including totals, note, count, and closing time. Later transaction changes are flagged without rewriting the saved closing. Check amounts before saving; reopening a closing is not currently supported. Database backups include saved closings. Older backups created before this feature do not contain them.

