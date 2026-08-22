# Coteja — evidence packet: clean-baseline

**Verdict:** NEEDS_HUMAN_REVIEW
**Generated:** 2026-08-22T16:14:34.993Z · fully local inference
**Model:** QWEN3_1_7B_INST_Q4 (Q4, ctx 8192) on Apple M3 · 8 GB RAM · darwin arm64

## Needs human review (3)

### missing_document#001 — document "lc" (letter_of_credit) could not be checked automatically: extraction failed validation: lcNumber.ref.0: Expected number, received string; applicantName.ref.0: Expected number, received string; beneficiaryName.ref.0: Expected number, received string; amount.value: Expected number, received string; amount.ref.0: Expected number, received string; currencyCode.ref.0: Expected number, received string; latestShipmentDate.ref.0: Expected number, received string; expiryDate.ref.0: Expected number, received string
severity: **MEDIUM**
review reason: evidence lock notes: no resolvable source evidence
_no machine-resolvable evidence — verify manually_
provenance: ocr:OCR_LATIN → extraction:QWEN3_1_7B_INST_Q4 → deterministic:typescript

### missing_document#002 — document "invoice" (commercial_invoice) could not be checked automatically: extraction failed validation: lineItems.0.quantity.value: Expected number, received string; lineItems.0.unitPrice.value: Expected number, received string; lineItems.0.total.value: Expected number, received string; grandTotal.value: Expected number, received string; beneficiaryAccount.quote: String must contain at least 1 character(s); beneficiaryAccount.ref: Array must contain at least 1 element(s)
severity: **MEDIUM**
review reason: evidence lock notes: no resolvable source evidence
_no machine-resolvable evidence — verify manually_
provenance: ocr:OCR_LATIN → extraction:QWEN3_1_7B_INST_Q4 → deterministic:typescript

### missing_document#003 — document "packing-list" (packing_list) could not be checked automatically: extraction failed validation: lineItems.0.quantity.value: Expected number, received string; lineItems.1.quantity.value: Expected number, received string
severity: **MEDIUM**
review reason: evidence lock notes: no resolvable source evidence
_no machine-resolvable evidence — verify manually_
provenance: ocr:OCR_LATIN → extraction:QWEN3_1_7B_INST_Q4 → deterministic:typescript
## Reliability
- stages (ms): ocr 218203 · extraction 46210 · controls 1 · evidence lock 0
- median local generation speed: 64.9 tok/s over 4 calls
- docs checked: 4 · extraction repairs: 3 · human-review items: 3

_Every finding above cites its source text; the model does not get to decide whether its own answer is trustworthy._