# Coteja reliability report

Generated from bench run started 2026-08-22T23:32:12.447Z.
Model: **QWEN3_4B_INST_Q4_K_M** (Q4, ctx 8192) on Apple M3 · 8 GB RAM · darwin arm64. All inference local.

| dossier | precision | recall | consistency | median latency | rule failures |
|---|---|---|---|---|---|
| adversarial-injection | 1.00 | 1.00 | 100% | 407297 ms | 0.0% |
| clean-baseline | — | — | 100% | 359067 ms | 0.0% |
| messy-photo | 1.00 | 1.00 | 100% | 815431 ms | 0.0% |
| seeded-quantity-currency | 1.00 | 1.00 | 100% | 316011 ms | 0.0% |
