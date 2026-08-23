# Coteja — build log (QVAC Track, Aleph Hackathon 2026)

Window: Sat 22 Aug 2026, 16:00 Lagos → Sun 23 Aug 2026, 16:00 Lagos. Times below are Lagos time.

## Sat 16:00–17:00 — skeleton to first packet

- Repository and hackathon commit trail started at `beadd2d`.
- Added typed document/extraction models, Zod schemas, six deterministic rules, evidence packets and benchmark scaffolding.
- Added a model-free self-test command.
- Completed the first OCR → extraction → rules → evidence → packet run.

## Sat 17:00–19:30 — small-model failure work

Observed on Qwen3 1.7B Q4:

1. Stringified numeric values and references.
2. Empty/junk field objects.
3. Multiple numbers merged into one value.
4. OCR fragments returned out of visual reading order.
5. Injection phrases split across OCR blocks.
6. Prose-wrapped or malformed JSON.

Implemented deterministic coercion, normalization, line grouping, balanced JSON recovery and cross-block injection detection. Repeated 1.7B runs remained unstable, so the project moved to `QWEN3_4B_INST_Q4_K_M` at commit `2edc23e`.

## Sat 19:30–Sun 00:40 — evidence and repeated runs

- Added clean, seeded discrepancy and adversarial dossiers.
- Added the messy-photo dossier with rotation, blur, noise, uneven lighting and JPEG compression.
- Completed four dossiers × three sequential runs.
- All 12 runs matched expected verdicts; seeded discrepancy rule IDs produced precision/recall 1.00, verdict consistency 100%, and zero deterministic rule crashes.
- Published Markdown packets, a reliability table and direct GitHub permalinks to every QVAC inference call site.

## Sun 01:00–01:30 — field capture

- Added a printable document set and phone-photo ingest path.
- Captured the synthetic documents with an iPhone camera while displayed on screen.
- The field-capture dossier completed end to end with `PASS` in about 7.5 minutes.

## Sun morning — final truth and safety pass

- Moved injection scanning before extraction and redact all affected OCR blocks from model input.
- Added exact quote-to-OCR grounding for every extracted field.
- A partial chunk failure now routes the whole document to human review.
- Repair prompts now include the original numbered OCR source and specific validation error.
- Low-confidence evidence now downgrades discrepancies to human review.
- Expanded model-free self-tests from 8 to 12 and corrected README/demo claims.
- Added the raw benchmark artifact and an MIT license.
- Re-ran the adversarial dossier end to end: two OCR blocks redacted before extraction; expected shipment-date discrepancy retained; zero repairs and zero human-review items.
- Re-ran the exact messy-photo demo dossier after hardening: expected quantity discrepancy retained with grounded citations, zero repairs and zero human-review items in just over 9 minutes.
- Verified a clean copied checkout with `npm ci`, TypeScript compilation and all 12 self-tests.

## Honest notes

- Documents are synthetic; no customer data is included.
- The messy dossier is synthetically degraded. The field-capture dossier is a genuine phone photo of the synthetic documents displayed on screen.
- Benchmark precision/recall is measured at seeded rule-ID level, and consistency means verdict consistency.
- Full-dossier latency ranges from minutes to low tens of minutes on the 8 GB M3 machine.
- Coteja covers six structural controls, not complete UCP 600 legal review.
