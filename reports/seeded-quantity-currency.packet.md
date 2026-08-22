# Coteja — evidence packet: seeded-quantity-currency

**Verdict:** DISCREPANCY
**Generated:** 2026-08-22T18:14:12.168Z · fully local inference
**Model:** QWEN3_4B_INST_Q4_K_M (Q4, ctx 8192) on Apple M3 · 8 GB RAM · darwin arm64

## Discrepancies (2)

### quantity_mismatch#001 — quantity mismatch for "Malting barley; grade A": invoice says 1200, packing list says 1180
severity: **HIGH**
check: `invoice 1200 ≠ packing list 1180 (tolerance 0)`
- invoice p1 · OCR confidence 99.1% · bbox [86, 611, 465, 654]: “Item 1 quantity: 1200 MT”
- packing-list p1 · OCR confidence 75.1% · bbox [85, 500, 465, 543]: “Item 1 quantity: 1180 MT”
provenance: ocr:OCR_LATIN → extraction:QWEN3_4B_INST_Q4_K_M → deterministic:typescript

### currency_mismatch#002 — documents disagree on currency: USD (lc) vs EUR (invoice)
severity: **HIGH**
check: `distinct currencies found: USD, EUR`
- lc p1 · OCR confidence 77.2% · bbox [85, 499, 680, 543]: “Currency and amount: USD 252600.00”
- invoice p1 · OCR confidence 99.8% · bbox [85, 399, 322, 444]: “Currency: EUR”
provenance: ocr:OCR_LATIN → extraction:QWEN3_4B_INST_Q4_K_M → deterministic:typescript
## Reliability
- stages (ms): ocr 200795 · extraction 111966 · controls 4 · evidence lock 0
- median local generation speed: 15.6 tok/s over 4 calls
- docs checked: 4 · extraction repairs: 0 · human-review items: 0

_Every finding above cites its source text; the model does not get to decide whether its own answer is trustworthy._