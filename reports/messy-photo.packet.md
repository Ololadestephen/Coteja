# Coteja — evidence packet: messy-photo

**Verdict:** DISCREPANCY
**Generated:** 2026-08-22T21:49:54.594Z · fully local inference
**Model:** QWEN3_4B_INST_Q4_K_M (Q4, ctx 8192) on Apple M3 · 8 GB RAM · darwin arm64

## Discrepancies (1)

### quantity_mismatch#001 — quantity mismatch for "Malting barley; grade A": invoice says 1200, packing list says 1150
severity: **HIGH**
check: `invoice 1200 ≠ packing list 1150 (tolerance 0)`
- invoice p1 · OCR confidence 58.9% · bbox [117, 654, 502, 715]: “Item 1 quantity: 1200 MT”
- packing-list p1 · OCR confidence 96.9% · bbox [120, 505, 501, 550]: “Item 1 quantity: 1150 MT”
provenance: ocr:OCR_LATIN → extraction:QWEN3_4B_INST_Q4_K_M → deterministic:typescript
## Reliability
- stages (ms): ocr 460751 · extraction 99765 · controls 3 · evidence lock 0
- median local generation speed: 15.6 tok/s over 4 calls
- docs checked: 4 · extraction repairs: 0 · human-review items: 0

_Every finding above cites its source text; the model does not get to decide whether its own answer is trustworthy._