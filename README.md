# Coteja

**Offline trade-finance document checking.** Give Coteja a letter of credit, commercial invoice, packing list and bill of lading; it extracts their contents with local QVAC inference, checks them with deterministic rules, and emits an auditable discrepancy packet. No cloud model, no API key and no document data leaving the machine.

> The local model extracts; deterministic TypeScript verifies; a human decides. Any document that fails schema or source-quote grounding becomes human review instead of a guessed result.

Built for the **Aleph Hackathon 2026 — QVAC Track** during the 24-hour window from Aug 22, 12:00 ART to Aug 23, 12:00 ART. All QVAC integration was written during that window; see the [commit history](https://github.com/Ololadestephen/Coteja/commits/main).

## How it works

```text
document scans ──@qvac/sdk OCR──▶ numbered text blocks (text + optional bbox/confidence)
        │
        ▼
cross-block injection scan ──▶ flagged blocks redacted before model extraction
        │
        ▼
QWEN3 4B Q4_K_M extraction (temp 0, fixed seed, reasoning off)
   Zod-validated JSON · one source-aware repair attempt · else HUMAN_REVIEW
        │
        ▼
source-quote grounding ──▶ every extracted quote must resolve to its OCR reference
        │
        ▼
deterministic TypeScript control graph — six discrepancy rules
        │
        ▼
evidence lock — discrepancies without citations/calculations, or with low-confidence
evidence, are downgraded to HUMAN_REVIEW
        │
        ▼
PASS / DISCREPANCY / NEEDS HUMAN REVIEW + audit flags + measured timings
```

## QVAC capabilities used

| Capability | API | Model | Integration |
|---|---|---|---|
| OCR | `ocr()` through `@qvac/sdk` | `OCR_LATIN` (CRAFT + recognizer) | [`runOcrStage()`](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/pipeline/ocrStage.ts#L35) |
| Text generation | `loadModel()` + `completion()` | `QWEN3_4B_INST_Q4_K_M` | [`loadLlm()`](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/llm/load.ts#L15) · [`extractAndValidateChunk()`](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/llm/prompts.ts#L109) |

**Judge permalinks — start here:**

- QVAC OCR and optional bbox/confidence capture: [src/pipeline/ocrStage.ts L35](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/pipeline/ocrStage.ts#L35)
- OCR reading-order reconstruction: [src/pipeline/textAssembly.ts L29](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/pipeline/textAssembly.ts#L29)
- Local model load with ctx 8192 and reasoning disabled: [src/llm/load.ts L15](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/llm/load.ts#L15)
- Extraction, schema validation and source-aware repair: [src/llm/prompts.ts L109](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/llm/prompts.ts#L109)
- Cross-block injection detection and pre-extraction redaction: [src/guard/injectionScan.ts L11](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/guard/injectionScan.ts#L11) · [L63](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/guard/injectionScan.ts#L63)
- Exact source-quote grounding: [src/pipeline/grounding.ts L27](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/pipeline/grounding.ts#L27)
- Six deterministic rules with no model access: [src/pipeline/controlsStage.ts L12](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/pipeline/controlsStage.ts#L12)
- Evidence lock and human-review downgrade: [src/pipeline/evidenceStage.ts L8](https://github.com/Ololadestephen/Coteja/blob/968b1ba8cc0437b65d6e0d122d0e261b6c4eaf34/src/pipeline/evidenceStage.ts#L8)

## Model, hardware and latency

| Item | Measured configuration |
|---|---|
| LLM | Qwen3 4B Instruct, Q4_K_M quantization |
| OCR | `OCR_LATIN` ONNX pipeline (CRAFT + recognizer) |
| Generation | ctx 8192, `reasoning_budget: 0`, temperature 0, fixed seed |
| Hardware | Apple M3 · 8 GB RAM · macOS arm64 · Metal acceleration |
| Generation speed | approximately 15–28 tok/s |
| Full dossier | benchmark medians from 316 s to 815 s (about 5.3–13.6 minutes), depending on image quality |

The smaller Qwen3 1.7B model passed individual examples but failed stochastically under repeated runs with empty or malformed extraction output. We moved to 4B Q4_K_M because reliability mattered more than headline speed.

## Reliability results

The tracked [raw benchmark](reports/bench.json) contains four synthetic dossiers run three times each. Precision and recall below are **rule-ID-level** metrics against seeded discrepancy rules; consistency is **verdict consistency**, not byte-for-byte output identity.

Run it with `npm run bench -- 3`.

| dossier | rule-ID precision | rule-ID recall | verdict consistency | median latency | rule failures |
|---|---:|---:|---:|---:|---:|
| adversarial-injection | 1.00 | 1.00 | 100% | 407 s | 0% |
| clean-baseline | — | — | 100% | 359 s | 0% |
| messy-photo (rotation, noise, low light, JPEG) | 1.00 | 1.00 | 100% | 815 s | 0% |
| seeded-quantity-currency | 1.00 | 1.00 | 100% | 316 s | 0% |

**All 12 benchmark runs matched their expected verdict, and no seeded discrepancy rule was missed.** The adversarial fixture contains an injected approval command split across OCR content; Coteja detects the affected blocks and redacts them before local-model extraction. The deterministic rules still identify the independent shipment-date violation.

After the final redaction and grounding hardening, an additional adversarial end-to-end run again produced the expected `DISCREPANCY`, with two pre-extraction redaction flags, grounded date evidence, zero repairs and zero human-review items.

The final hardened messy-photo run also produced its expected quantity `DISCREPANCY` with grounded evidence, zero repairs and zero human-review items in just over 9 minutes. Its generated packet is tracked at [`reports/messy-photo.packet.md`](reports/messy-photo.packet.md).

A separate field-capture dossier uses genuine phone-camera photographs of the same synthetic documents displayed on screen. Its recorded end-to-end run produced `PASS` in about 7.5 minutes.

## Clean-clone setup

```bash
git clone https://github.com/Ololadestephen/Coteja.git
cd Coteja
npm ci
npm run typecheck
npm run coteja -- --selftest
npx qvac doctor                       # optional local diagnostic
npm run coteja -- dossiers/clean      # first full local run
```

Requirements: macOS arm64 with Metal, 8 GB+ RAM and Node.js 20+. The first full run downloads approximately 2.5 GB of 4B and OCR model weights to QVAC's local cache.

## Honest limitations

- The trade documents are synthetic and contain no customer data. The field-capture variant is a phone-camera capture of those documents displayed on screen.
- The repeated benchmark covers four fixtures × three runs; field capture has one recorded end-to-end run.
- Quote grounding proves that the model-provided quote occurs in its referenced OCR block. It does not prove full legal or semantic correctness of every extracted value.
- Six rules cover structural reconciliation, not complete UCP 600 legal compliance.
- Full-dossier latency is measured in minutes, not seconds.
- Final decisions remain with a human operator; `HUMAN_REVIEW` is a product feature, not a hidden fallback.

## License

MIT — see [LICENSE](LICENSE).
