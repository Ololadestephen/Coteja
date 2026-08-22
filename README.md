# Coteja

**Offline trade-finance document checker.** Drop in a letter of credit, commercial invoice, packing list and bill of lading; Coteja extracts their contents with a small local LLM, checks them against each other with deterministic rules, and emits a source-linked discrepancy packet — entirely on-device. No cloud. No API keys. No data leaves the machine.

> Coteja doesn't assume a small model is reliable. It constrains it, measures it and verifies it until it can safely do operations work. The model never decides: deterministic TypeScript does every calculation, comparison and verdict, and no finding reaches the packet without resolvable evidence.

Built for the **Aleph Hackathon 2026 — QVAC Track** during the 24h build window (Aug 22, 12:00 ART → Aug 23, 12:00 ART). All QVAC integration code in this repo was written during that window; see [commit history](../../commits).

## How it works

```
document scans ──@qvac/sdk OCR──▶ numbered text blocks (bbox + confidence)
        │
        ▼
QWEN3 1.7B extraction pass (temp 0, seeded, reasoning off)
   Zod-validated JSON · one repair attempt · else HUMAN_REVIEW
        │
        ▼
deterministic control graph (TypeScript) — six discrepancy rules
        │
        ▼
evidence lock — findings without citations/calculations are downgraded
        │
        ▼
PASS / DISCREPANCY / NEEDS HUMAN REVIEW  +  injection flags  +  reliability stats
```

## QVAC capabilities used

| Capability | API | Model | Where |
|---|---|---|---|
| OCR | `ocr()` via `@qvac/sdk` | `OCR_LATIN` (CRAFT detector + recognizer) | <!-- TODO permalink src/pipeline/ocrStage.ts --> |
| Text generation | `completion()` + `loadModel()` | `QWEN3_1_7B_INST_Q4` | <!-- TODO permalink src/llm/load.ts, src/llm/prompts.ts --> |

**Integration permalinks** (judges: start here):

- OCR stage: <!-- TODO: push, then paste permanent GitHub link with line anchor -->
- Extraction prompts + validation loop: <!-- TODO -->
- Model load config (`ctx_size`, `reasoning_budget: 0`): <!-- TODO -->

## Model & hardware

| Item | Value |
|---|---|
| LLM | QWEN3 1.7B Instruct, Q4 quantization |
| OCR | OCR_LATIN ONNX pipeline |
| Context | 8192 tokens |
| Hardware | <!-- TODO: measured on M3 / 8 GB --> |
| Median speed | <!-- TODO: measured tok/s --> |

## Reliability results

Run `npm run bench -- <runs>`; every dossier runs N times, sequentially.

<!-- TODO: paste generated table from reports/bench.json -->

## Clean-clone setup

```bash
git clone <this-repo> && cd coteja
npm install
npm run typecheck
npm run coteja -- --selftest     # schema sanity, no models needed
npx qvac doctor                  # optional CLI diagnostic
npm run coteja -- dossiers/clean # full local run (downloads models on first use)
```

Requirements: macOS arm64 (Metal), 8 GB+ RAM, Node 20+. First run downloads ~1.2 GB of model weights into the local cache.

## Honest limitations

- Synthetic test documents only; no real transactions.
- Six rules cover structural mismatches, not UCP 600 legal compliance.
- Final decisions always remain with a human operator; Coteja's HUMAN_REVIEW path is a feature, not a fallback.
- Small-model extraction is imperfect by design; the evidence lock quarantines anything it cannot verify.

## License

MIT
