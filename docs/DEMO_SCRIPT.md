# Coteja — recording script (about 3 minutes)

Record only after the final verification run and GitHub push. Keep Wi-Fi visibly off throughout the product run. The full dossier takes minutes, so record it end to end separately and show the middle at an explicitly labelled speed-up; do not imply that a cached packet was produced live.

## 0:00–0:20 — The stakes

Screen: title card, then the four document types in `dossiers/messy/`.

VO: “One trade transaction can mean four confidential documents and an operations officer comparing them line by line. Coteja performs that first-pass reconciliation on one laptop, without sending the documents to a cloud model.”

## 0:20–0:42 — Prove it is local

Screen: Wi-Fi off, `src/config.ts`, then the terminal command:

```bash
npm run coteja -- dossiers/messy --out reports
```

VO: “QVAC runs OCR and Qwen3 4B Q4 locally with Metal acceleration. There are no API keys and no cloud inference. Context is set to 8192, reasoning is disabled, temperature is zero, and the seed is fixed.”

## 0:42–1:20 — End-to-end operation

Screen: the full terminal recording. Keep the phase messages visible; label the waiting section `8m14s final verified local run — middle shown at 20×`. Return to normal speed when the extraction/controls messages and final packet print.

VO: “These images are deliberately rotated, noisy, low-light and JPEG-compressed. QVAC OCR returns text plus available bounding boxes and confidence. Injection-like blocks are detected and redacted before extraction. The local model proposes structured fields; Zod validates them, and every model-provided quote must resolve to its cited OCR block. A failed schema, failed chunk or ungrounded quote becomes human review.”

## 1:20–1:58 — The discrepancy packet

Screen: open the packet produced by that run, `reports/messy-photo.packet.md`, and show the verdict, calculation and both citations.

VO: “The verdict is discrepancy. The invoice says twelve hundred metric tons; the packing list says eleven-fifty. Six deterministic TypeScript rules—not the model—perform the comparisons and decide the verdict. This finding includes the source document, page, OCR quote, bounding box, confidence and the exact comparison. If evidence is missing or low-confidence, the evidence lock downgrades the result to human review.”

## 1:58–2:25 — The adversarial document

Screen: `reports/adversarial-injection.packet.md`, first the untrusted-content flags, then the shipment-date finding.

VO: “This invoice contains an injected approval command split across OCR content. Coteja detects the affected blocks and removes them from the model input while retaining an audit flag. The independent deterministic controls still catch the real problem: shipment happened after the credit’s permitted date.”

## 2:25–2:52 — Reliability, not one lucky run

Screen: README reliability table, then briefly show `reports/bench.json` and the phone-capture images.

VO: “We ran four seeded dossiers three times each. All twelve runs matched their expected verdict, with one hundred percent verdict consistency and rule-ID precision and recall of one-point-zero on the discrepancy cases. We also passed one end-to-end run on genuine phone-camera captures of the synthetic documents. Full dossier latency ranged from about five to fourteen minutes.”

## 2:52–3:08 — Close

Screen: repository URL and `git log --oneline -8`.

VO: “Coteja turns private trade paperwork into an auditable local operation. The model extracts, deterministic code verifies, and humans decide. Built during the Aleph Hackathon with QVAC.”

## Recording rules

- Record at 1080p with terminal font size 17 or larger.
- Pre-warm downloaded models, but do not substitute a cached packet for the end-to-end run.
- A labelled time-lapse or jump cut is acceptable; an undisclosed cut is not.
- Do not claim real customer data, complete UCP 600 compliance, semantic verification of every value, or sub-minute latency.
- Add the final YouTube URL to the project submission and near the top of the README after upload.
