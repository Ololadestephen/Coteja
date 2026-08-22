import type { OcrBlock } from '../types/ocr.js'
import { MAX_CHUNK_CHARS } from '../config.js'

export function sortReadingOrder(blocks: readonly OcrBlock[]): OcrBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page
    const ay = a.bbox?.[1] ?? 0
    const by = b.bbox?.[1] ?? 0
    if (Math.abs(ay - by) > 1e-6) return ay - by
    const ax = a.bbox?.[0] ?? 0
    const bx = b.bbox?.[0] ?? 0
    return ax - bx
  })
}

export interface NumberedChunk {
  startIndex: number
  lines: string[]
}

export function assembleNumberedChunks(
  blocks: readonly OcrBlock[],
  maxChars: number = MAX_CHUNK_CHARS,
): NumberedChunk[] {
  const chunks: NumberedChunk[] = []
  let lines: string[] = []
  let charCount = 0
  let startIndex = 0
  blocks.forEach((block, index) => {
    const line = `[${index}] p${block.page}: ${block.text.trim()}`
    if (lines.length > 0 && charCount + line.length > maxChars) {
      chunks.push({ startIndex, lines })
      lines = []
      charCount = 0
      startIndex = index
    }
    lines.push(line)
    charCount += line.length
  })
  if (lines.length > 0) {
    chunks.push({ startIndex, lines })
  }
  return chunks
}
