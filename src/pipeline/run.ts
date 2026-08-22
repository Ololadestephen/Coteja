import { performance } from 'node:perf_hooks'
import os from 'node:os'
import { loadDossier } from '../dossier/loadDossier.js'
import type { LoadedDossier } from '../dossier/loadDossier.js'
import { runOcrStage } from './ocrStage.js'
import { runExtractionStage } from './extractionStage.js'
import { runControlsStage } from './controlsStage.js'
import { applyEvidenceLock } from './evidenceStage.js'
import { scanBlocksForInjections } from '../guard/injectionScan.js'
import { loadLlm, unloadLlm } from '../llm/load.js'
import {
  LLM_CTX_SIZE,
  MODEL_LABEL,
  MODEL_QUANTIZATION,
} from '../config.js'
import type { OcrDoc } from '../types/documents.js'
import type { EvidencePacket, Verdict } from '../types/packet.js'

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

export async function cotejaRun(dossierDir: string): Promise<EvidencePacket> {
  const loaded: LoadedDossier = loadDossier(dossierDir)
  const t0 = performance.now()

  const ocrStart = performance.now()
  const blocksByDocId = await runOcrStage(loaded.manifest, loaded.dir)
  const ocrMs = performance.now() - ocrStart

  const llmStart = performance.now()
  const modelId = await loadLlm()
  const docsMap = new Map<string, { type: (typeof loaded.manifest.docs)[number]['type']; blocks: import('../types/ocr.js').OcrBlock[] }>()
  for (const doc of loaded.manifest.docs) {
    docsMap.set(doc.docId, { type: doc.type, blocks: blocksByDocId.get(doc.docId) ?? [] })
  }
  const extraction = await runExtractionStage(modelId, docsMap)
  await unloadLlm(modelId)
  const extractionMs = performance.now() - llmStart

  const injectionFlags = loaded.manifest.docs.flatMap((doc) =>
    scanBlocksForInjections(doc.docId, blocksByDocId.get(doc.docId) ?? []),
  )

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
