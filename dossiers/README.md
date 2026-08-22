# Dossiers

A dossier is a folder with:

- `manifest.json` — dossier id + the documents to check
- `ground-truth.json` — optional; enables precision/recall scoring during benchmarks
- one or more document images per doc (PNG/JPG/BMP scans)

```json
{
  "dossierId": "seeded-1",
  "docs": [
    { "docId": "lc", "type": "letter_of_credit", "imagePaths": ["lc.png"] },
    { "docId": "invoice", "type": "commercial_invoice", "imagePaths": ["invoice.png"] },
    { "docId": "packing-list", "type": "packing_list", "imagePaths": ["packing-list.png"] },
    { "docId": "bol", "type": "bill_of_lading", "imagePaths": ["bol.png"] }
  ]
}
```

Doc types: `letter_of_credit` · `commercial_invoice` · `packing_list` · `bill_of_lading`

Ground truth:

```json
{
  "expectedVerdict": "DISCREPANCY",
  "expectedDiscrepancyRules": ["quantity_mismatch", "currency_mismatch"]
}
```

Rule ids: `quantity_mismatch`, `total_arithmetic`, `currency_mismatch`, `shipment_date`, `party_mismatch`, `missing_document`.

The images in these folders are synthetic trade-finance documents created for testing. They are not real transactions.
