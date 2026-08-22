import { LOW_OCR_CONFIDENCE_THRESHOLD } from '../config.js'
import type { BBox, OcrBlock } from './ocr.js'
import type { ProvenanceTag } from './provenance.js'

export type FindingStatus = 'DISCREPANCY' | 'HUMAN_REVIEW'
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'

export interface SourceEvidence {
  docId: string
  page: number
  quote: string
  bbox?: BBox
  ocrConfidence?: number
  lowConfidence: boolean
}

export interface Finding {
  id: string
  ruleId: string
  status: FindingStatus
  severity: Severity
  message: string
  calculation?: string
  evidence: SourceEvidence[]
  provenance: ProvenanceTag[]
  reviewReason?: string
}

let findingCounter = 0

export function nextFindingId(ruleId: string): string {
  findingCounter += 1
  return `${ruleId}#${String(findingCounter).padStart(3, '0')}`
}

export function resolveSources(
  docId: string,
  blocks: readonly OcrBlock[],
  refs: readonly number[],
): { sources: SourceEvidence[]; unresolvedRefs: number[] } {
  const sources: SourceEvidence[] = []
  const unresolvedRefs: number[] = []
  for (const ref of refs) {
    const block = blocks[ref]
    if (!block || block.text.trim().length === 0) {
      unresolvedRefs.push(ref)
      continue
    }
    sources.push({
      docId,
      page: block.page,
      quote: block.text.trim().slice(0, 200),
      bbox: block.bbox,
      ocrConfidence: block.confidence,
      lowConfidence:
        block.confidence !== undefined && block.confidence < LOW_OCR_CONFIDENCE_THRESHOLD,
    })
  }
  return { sources, unresolvedRefs }
}
