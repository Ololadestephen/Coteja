import { performance } from 'node:perf_hooks'
import os from 'node:os'
import { loadDossier } from '../dossier/loadDossier.js'
import type { LoadedDossier } from '../dossier/loadDossier.js'
import { runOcrStage } from './ocrStage.js'
import { runExtractionStage } from './extractionStage.js'
import { runControlsStage } from './controlsStage.js'
import { applyEvidenceLock } from './evidenceStage.js'
import { redactFlaggedBlocks, scanBlocksForInjections } from '../guard/injectionScan.js'
import { loadLlm, unloadLlm } from '../llm/load.js'
import {
  LLM_CTX_SIZE,
  MODEL_LABEL,
  MODEL_QUANTIZATION,
} from '../config.js'
import type { OcrDoc } from '../types/documents.js'
import type { EvidencePacket, Verdict } from '../types/packet.js'

export type ProgressReporter = (message: string) => void

function computeVerdict(findings: readonly { status: string }[]): Verdict {
  if (findings.some((f) => f.status === 'DISCREPANCY')) return 'DISCREPANCY'
  if (findings.some((f) => f.status === 'HUMAN_REVIEW')) return 'NEEDS_HUMAN_REVIEW'
  return 'PASS'
}

export function hardwareLabel(): string {
  const cpuModel = os.cpus()[0]?.model?.trim() ?? 'unknown-cpu'
  const totalGb = Math.round(os.totalmem() / 1073741824)
  return `${cpuModel} · ${totalGb} GB RAM · ${os.platform()} ${os.arch()}`
}

export async function cotejaRun(
  dossierDir: string,
  reportProgress: ProgressReporter = () => undefined,
): Promise<EvidencePacket> {
  const loaded: LoadedDossier = loadDossier(dossierDir)
  const t0 = performance.now()

  reportProgress(`OCR: reading ${loaded.manifest.docs.length} documents with QVAC`)
  const ocrStart = performance.now()
  const blocksByDocId = await runOcrStage(loaded.manifest, loaded.dir)
  const ocrMs = performance.now() - ocrStart
  reportProgress(`OCR complete in ${(ocrMs / 1000).toFixed(1)}s`)

  const injectionFlags = loaded.manifest.docs.flatMap((doc) =>
    scanBlocksForInjections(doc.docId, blocksByDocId.get(doc.docId) ?? []),
  )
  reportProgress(
    injectionFlags.length === 0
      ? 'Injection scan: no untrusted-content patterns found'
      : `Injection scan: ${injectionFlags.length} block(s) redacted before extraction`,
  )

  reportProgress(`Extraction: loading ${MODEL_LABEL} and validating grounded fields`)
  const llmStart = performance.now()
  const docsMap = new Map<string, { type: (typeof loaded.manifest.docs)[number]['type']; blocks: import('../types/ocr.js').OcrBlock[] }>()
  for (const doc of loaded.manifest.docs) {
    const originalBlocks = blocksByDocId.get(doc.docId) ?? []
    docsMap.set(doc.docId, {
      type: doc.type,
      blocks: redactFlaggedBlocks(doc.docId, originalBlocks, injectionFlags),
    })
  }
  const modelId = await loadLlm()
  const extraction = await runExtractionStage(modelId, docsMap).finally(async () => {
    await unloadLlm(modelId)
  })
  const extractionMs = performance.now() - llmStart
  const extractedCount = [...extraction.outcomesByDocId.values()].filter(
    (outcome) => outcome.status === 'extracted',
  ).length
  reportProgress(
    `Extraction complete in ${(extractionMs / 1000).toFixed(1)}s (${extractedCount}/${loaded.manifest.docs.length} documents grounded)`,
  )

  reportProgress('Controls: running six deterministic TypeScript rules')
  const controlsStart = performance.now()
  const ocrDocs: OcrDoc[] = loaded.manifest.docs.map((doc) => ({
    docId: doc.docId,
    type: doc.type,
    blocks: blocksByDocId.get(doc.docId) ?? [],
  }))
  const controls = runControlsStage(loaded.manifest, extraction.outcomesByDocId, ocrDocs)
  const controlsMs = performance.now() - controlsStart

  const lockStart = performance.now()
  const lock = applyEvidenceLock(controls.findings)
  const evidenceLockMs = performance.now() - lockStart
  reportProgress('Evidence lock complete; rendering the auditable packet')

  return {
    dossierId: loaded.manifest.dossierId,
    verdict: computeVerdict(lock.locked),
    generatedAtIso: new Date().toISOString(),
    findings: lock.locked,
    injectionFlags,
    timings: {
      ocr: Math.round(ocrMs),
      extraction: Math.round(extractionMs),
      controls: Math.round(controlsMs),
      evidenceLock: Math.round(evidenceLockMs),
      total: Math.round(performance.now() - t0),
    },
    run: {
      modelLabel: MODEL_LABEL,
      quantization: MODEL_QUANTIZATION,
      ctxSize: LLM_CTX_SIZE,
      hardware: hardwareLabel(),
      tokensPerSecond: extraction.tokensPerSecond.filter((n): n is number => typeof n === 'number'),
    },
    stats: {
      docsChecked: loaded.manifest.docs.length,
      repairsUsed: extraction.repairsUsed,
      humanReviews: lock.locked.filter((f) => f.status === 'HUMAN_REVIEW').length,
      ruleFailures: controls.failedRuleIds.length,
    },
  }
}
