import { loadModel, ocr, unloadModel } from '@qvac/sdk'
import type { DossierManifest } from '../types/documents.js'
import { OCR_MODEL_SRC, LOW_OCR_CONFIDENCE_THRESHOLD } from '../config.js'
import { mergeBlocksIntoLines } from './textAssembly.js'
import type { OcrBlock } from '../types/ocr.js'

interface RawOcrBlockLike {
  text?: unknown
  bbox?: unknown
  confidence?: unknown
}

function normalizeBlock(raw: RawOcrBlockLike, page: number): OcrBlock | null {
  if (typeof raw.text !== 'string' || raw.text.trim().length === 0) {
    return null
  }
  const block: OcrBlock = { text: raw.text, page }
  if (
    Array.isArray(raw.bbox) &&
    raw.bbox.length === 4 &&
    raw.bbox.every((n) => typeof n === 'number')
  ) {
    block.bbox = [raw.bbox[0], raw.bbox[1], raw.bbox[2], raw.bbox[3]]
  }
  if (typeof raw.confidence === 'number') {
    block.confidence = raw.confidence
  }
  return block
}

function joinPath(base: string, relative: string): string {
  return `${base.replace(/\/+$/, '')}/${relative}`
}

export async function runOcrStage(
  manifest: DossierManifest,
  dossierDir: string,
): Promise<Map<string, OcrBlock[]>> {
  const modelId = await loadModel({
    modelSrc: OCR_MODEL_SRC,
    modelConfig: {
      langList: ['en'],
      magRatio: 1.5,
      defaultRotationAngles: [90, 180, 270],
      contrastRetry: false,
      lowConfidenceThreshold: LOW_OCR_CONFIDENCE_THRESHOLD,
      recognizerBatchSize: 1,
    },
  })
  const blocksByDocId = new Map<string, OcrBlock[]>()
  try {
    for (const doc of manifest.docs) {
      const blocks: OcrBlock[] = []
      for (let pageIndex = 0; pageIndex < doc.imagePaths.length; pageIndex++) {
        const imagePath = joinPath(dossierDir, doc.imagePaths[pageIndex])
        const result = ocr({ modelId, image: imagePath, options: { paragraph: false } })
        const rawBlocks = (await result.blocks) as RawOcrBlockLike[]
        for (const raw of rawBlocks) {
          const normalized = normalizeBlock(raw, pageIndex + 1)
          if (normalized !== null) {
            blocks.push(normalized)
          }
        }
      }
      blocksByDocId.set(doc.docId, mergeBlocksIntoLines(blocks))
    }
  } finally {
    await unloadModel({ modelId, clearStorage: false })
  }
  return blocksByDocId
}
