# Coteja — Build Log (QVAC Track, Aleph Hackathon 2026)

Window: Sat 22 Aug 2026, 16:00 Lagos → Sun 23 Aug, 16:00 Lagos. This file is written during the window; timestamps are Lagos time.

## Sat 16:00–17:00 — skeleton to first packet

- Repo created from BLUEPRINT.md; commit trail started (`364f792`).
- Types, Zod extraction schemas, six-rule engine contract, evidence lock, bench harness — all committed before any model ran.
- `--selftest` validates schemas + merge logic with zero model calls.
- First end-to-end run: OCR → extraction → rules → evidence lock → packet. The evidence lock did its job immediately: unparseable extractions became HUMAN_REVIEW items, never guesses.

## Sat 17:00–18:00 — making a 1.7B model tell the truth

Failure modes observed on QWEN3_1_7B_INST_Q4 and the deterministic fixes built for each:

1. Stringified numbers/refs → deterministic coercion at schema boundary.
2. Junk empty-field objects → `normalizeModelObject` strips them pre-validation.
3. `"1200 MT x 210.50"` merged into one number by our own preprocessor → switched to first-number-token extraction.
4. OCR split one visual line into fragments with 1px y-jitter → **line-grouping merge** (vertical-overlap grouping, x-sorted within line, union bbox, min confidence). This also fixed scrambled reading order.
5. Injection phrase split across three OCR blocks → cross-block joined scan with offset→block mapping.
6. Prose-wrapped/malformed JSON → balanced-brace object recovery.

## Sat ~18:00 — model upgrade decision

1.7B passed clean runs but failed stochastically across repeated runs (GPU float non-determinism at temp 0) — empty extractions, missing JSON. Rather than cherry-pick a lucky demo run, we A/B'd `QWEN3_4B_INST_Q4_K_M`: all three dossiers matched ground truth with zero repairs and zero reviews. Switched (`9c89569`). Cost: ~28 tok/s vs ~63 tok/s warm. Reliability won; that trade is the thesis of this project.

**Current state:** clean→PASS, seeded→DISCREPANCY[quantity,currency], adversarial→DISCREPANCY[shipment_date]+injection flag. All matching ground truth.

## In progress — benchmark

3 dossiers × 3 sequential runs (~4.5 min/run) producing precision/recall vs ground truth, consistency, median latency. Results land in `reports/bench.json` + README.

## Honest notes

- Fixtures are synthetic typed scans (generator: `scripts/makeFixtures.py`). No messy-photo dossier yet — highest-value remaining work if time allows.
- Commit signing disabled (passphrase-protected key unavailable in automation); history is intact and authored.
- OCR is slow (~60-90s/page on M3); acceptable for MVP, listed as limitation.
