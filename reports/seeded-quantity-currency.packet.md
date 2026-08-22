# Coteja — evidence packet: seeded-quantity-currency

**Verdict:** DISCREPANCY
**Generated:** 2026-08-22T17:52:03.065Z · fully local inference
**Model:** QWEN3_1_7B_INST_Q4 (Q4, ctx 8192) on Apple M3 · 8 GB RAM · darwin arm64

## Discrepancies (1)

### quantity_mismatch#001 — quantity mismatch for "Malting barley; grade A": invoice says 1200, packing list says 1180
severity: **HIGH**
check: `invoice 1200 ≠ packing list 1180 (tolerance 0)`
- invoice p1 · OCR confidence 99.1% · bbox [86, 611, 465, 654]: “Item 1 quantity: 1200 MT”
- packing-list p1 · OCR confidence 75.1% · bbox [85, 500, 465, 543]: “Item 1 quantity: 1180 MT”
provenance: ocr:OCR_LATIN → extraction:QWEN3_1_7B_INST_Q4 → deterministic:typescript
## Needs human review (2)

### missing_document#002 — document "lc" (letter_of_credit) could not be checked automatically: extraction failed validation: model output contained no JSON object
severity: **MEDIUM**
review reason: evidence lock notes: no resolvable source evidence
_no machine-resolvable evidence — verify manually_
provenance: ocr:OCR_LATIN → extraction:QWEN3_1_7B_INST_Q4 → deterministic:typescript

### missing_document#003 — document "bol" (bill_of_lading) could not be checked automatically: extraction failed validation: shippedOnBoardDate.value: Expected string, received number
severity: **MEDIUM**
review reason: evidence lock notes: no resolvable source evidence
_no machine-resolvable evidence — verify manually_
provenance: ocr:OCR_LATIN → extraction:QWEN3_1_7B_INST_Q4 → deterministic:typescript
## Reliability
- stages (ms): ocr 288398 · extraction 57521 · controls 7 · evidence lock 1
- median local generation speed: 35.7 tok/s over 4 calls
- docs checked: 4 · extraction repairs: 2 · human-review items: 2

_Every finding above cites its source text; the model does not get to decide whether its own answer is trustworthy._