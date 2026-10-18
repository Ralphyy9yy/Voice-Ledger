# Offline verification

## Procedure

1. Install npm packages, FFmpeg, whisper.cpp, the Whisper model, Ollama, and the configured Ollama model while online.
2. Build with `npm.cmd run build`.
3. Disable external network connectivity while retaining loopback (turn off Wi-Fi/Ethernet; do not disable the loopback adapter).
4. Start Ollama and VoiceLedger production mode.
5. In browser developer tools, clear the Network log and filter out `127.0.0.1`/`localhost`; unexpected requests should remain empty.
6. Record and transcribe a short clip, correct it, extract a draft, confirm it, search history, check the dashboard, export CSV, and create a backup.
7. Restart VoiceLedger and confirm the entry remains.

## Delivery status

Automated typed creation/persistence, history summaries, export safeguards, and builds were verified. The real microphone → FFmpeg → whisper.cpp → Ollama path and a network-disabled run require locally installed binaries/models and were not verified in the delivery environment. Do not interpret test doubles or service-status UI as proof that AI is installed.
