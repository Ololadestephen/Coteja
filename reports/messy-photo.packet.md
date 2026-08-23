# Coteja — evidence packet: messy-photo

**Verdict:** DISCREPANCY
**Generated:** 2026-08-23T10:32:02.446Z · fully local inference
**Model:** QWEN3_4B_INST_Q4_K_M (Q4, ctx 8192) on Apple M3 · 8 GB RAM · darwin arm64

## Discrepancies (1)

### quantity_mismatch#001 — quantity mismatch for "Malting barley; grade A": invoice says 1200, packing list says 1150
severity: **HIGH**
check: `invoice 1200 ≠ packing list 1150 (tolerance 0)`
- invoice p1 · OCR confidence 58.9% · bbox [117, 654, 502, 715]: “Item 1 quantity: 1200 MT”
- packing-list p1 · OCR confidence 96.9% · bbox [120, 505, 501, 550]: “Item 1 quantity: 1150 MT”
provenance: ocr:OCR_LATIN → extraction:QWEN3_4B_INST_Q4_K_M → deterministic:typescript

## Reliability
- stages (ms): ocr 446377 · extraction 96963 · controls 16 · evidence lock 0
- median local generation speed: 17.0 tok/s over 4 calls
- docs checked: 4 · extraction repairs: 0 · human-review items: 0

_Every discrepancy above carries resolvable source evidence and a deterministic comparison; otherwise it is human review._
