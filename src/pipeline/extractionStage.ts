import { assembleNumberedChunks } from './textAssembly.js'
import { buildExtractionUserPrompt, extractAndValidateChunk } from '../llm/prompts.js'
import { mergePartialExtractions, wrapExtractedDocument } from './merge.js'
import type { OcrBlock } from '../types/ocr.js'
import type { DocType } from '../types/documents.js'
import type { ExtractionOutcome } from '../types/extraction.js'

export interface ExtractionStageResult {
  outcomesByDocId: Map<string, ExtractionOutcome>
  repairsUsed: number
  tokensPerSecond: number[]
}

export async function runExtractionStage(
  modelId: string,
  docs: ReadonlyMap<string, { type: DocType; blocks: OcrBlock[] }>,
): Promise<ExtractionStageResult> {
  const outcomesByDocId = new Map<string, ExtractionOutcome>()
  let repairsUsed = 0
  const tokensPerSecond: number[] = []

  for (const [docId, doc] of docs) {
    const chunks = assembleNumberedChunks(doc.blocks)
    if (chunks.length === 0) {
      outcomesByDocId.set(docId, {
        docId,
        status: 'needs_human_review',
        reason: 'OCR produced no text for this document',
      })
      continue
    }
    const validPartials: unknown[] = []
    let lastError: string | null = null
    for (const chunk of chunks) {
      const outcome = await extractAndValidateChunk(
        modelId,
        doc.type,
        buildExtractionUserPrompt(doc.type, chunk.lines.length, chunk.lines),
      )
      if (outcome.tokensPerSecondSample !== undefined) {
        tokensPerSecond.push(outcome.tokensPerSecondSample)
      }
      if (outcome.usedRepair) {
        repairsUsed += 1
      }
      if (outcome.ok && outcome.value !== undefined) {
        validPartials.push(outcome.value)
      } else {
        lastError = outcome.error ?? 'unknown extraction failure'
      }
    }
    if (validPartials.length === 0) {
      outcomesByDocId.set(docId, {
        docId,
        status: 'needs_human_review',
        reason: `extraction failed validation: ${lastError ?? 'no output'}`,
      })
      continue
    }
    const merged = mergePartialExtractions(validPartials)
    const wrapped = wrapExtractedDocument(docId, doc.type, merged)
    if (wrapped === null) {
      outcomesByDocId.set(docId, {
        docId,
        status: 'needs_human_review',
        reason: `merged extraction failed schema validation: ${lastError ?? 'unknown'}`,
      })
      continue
    }
    outcomesByDocId.set(docId, { docId, status: 'extracted', document: wrapped })
  }

  return { outcomesByDocId, repairsUsed, tokensPerSecond }
}
