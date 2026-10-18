# Local AI accuracy benchmark

Run `npm.cmd run benchmark:ai` with Ollama open. It evaluates 20 fictional examples against explicit expected facts, using the app's real extraction provider. It does not start a server, access the ledger database, or save transactions. Avoid simultaneous app inference while running the benchmark, which calls the provider directly.

The examples cover sales, expenses, multiple items, integer-centavo conversions, decimal prices, zero prices, missing facts, explicit versus calculated totals, unclear corrections, unrelated text, instruction-like input, Filipino/Tagalog, and Taglish. Regional Philippine languages have not been evaluated.

Each case passes only if transaction type, item count, documented item-name aliases, quantities, prices, and explicitly stated total match. Unclear corrections must produce a review warning. It does not grade note quality, every possible ambiguity, or source-excerpt faithfulness. Worded/plural item aliases are explicit; other reasonable names may fail and need human inspection. Do not weaken expected amounts just to raise the score.

The console prints case outcomes and draft times. Full results (inputs, expected facts, returned drafts, errors, and timings) are saved under `benchmarks/results/`, excluded from Git. Failures produce exit code 1. The first case may include model startup time; later cases are usually warm. Compare repeated runs on the same hardware and model, rather than treating a single latency as a promise.

For a short check:

```powershell
npm.cmd run benchmark:ai -- --limit 3
```

## Real speech evaluation

Text-only runs do not measure Whisper accuracy. To test speech, record yourself saying selected fixture texts exactly, save WebM, Ogg, or MP4 audio, and create a JSON manifest. WAV is not accepted by the app's upload pipeline. Keep clips under two minutes and 15 MB.

```json
[
  {"caseId":"en-sale","file":"recordings/en-sale.webm","language":"en"},
  {"caseId":"tl-sale","file":"recordings/tl-sale.webm","language":"tl"}
]
```

File paths are relative to the manifest. Valid case IDs and reference sentences are in `apps/server/src/evaluation/cases.ts`. Supply only recordings that correspond to their reference sentences; changing the sentence invalidates the expected facts.

```powershell
npm.cmd run benchmark:ai -- --audio-manifest "C:\path\to\manifest.json"
```

This runs the real FFmpeg → Whisper → Ollama pipeline. Reports separate speech time, draft time, and end-to-end time. Word error rate compares normalized words with the reference; it ignores capitalization and punctuation but does not equate spelled-out numbers with digits. WER can exceed 100% when the output inserts many extra words. Transaction fact accuracy is graded separately.

Audio stays local; temporary converted files are deleted. Your original recordings are retained. Reports contain transcripts, so treat them as private if you use personal recordings. Browser microphone quality and recording permissions must still be tested in the actual app.

Use failures to identify which stage needs improvement. Missing or invented amounts are blockers for unsupervised use. Passing these examples does not establish accuracy on accents, noisy recordings, untested languages, or all transactions. Keep human review mandatory.
