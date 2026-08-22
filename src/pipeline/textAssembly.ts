import type { BBox, OcrBlock } from '../types/ocr.js'
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

function verticalOverlapRatio(a: BBox, b: BBox): number {
  const aHeight = a[3] - a[1]
  const bHeight = b[3] - b[1]
  const overlap = Math.min(a[3], b[3]) - Math.max(a[1], b[1])
  const minHeight = Math.min(aHeight, bHeight)
  if (minHeight <= 0) return 0
  return overlap / minHeight
}

function unionBox(a: BBox, b: BBox): BBox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]
}

export function mergeBlocksIntoLines(
  blocks: readonly OcrBlock[],
  overlapThreshold: number = 0.45,
): OcrBlock[] {
  const boxed = blocks.filter((b) => b.bbox !== undefined && b.text.trim().length > 0)
  const unboxed = blocks.filter((b) => b.bbox === undefined && b.text.trim().length > 0)

  const groups: OcrBlock[][] = []
  const assigned = new Set<number>()
  for (let i = 0; i < boxed.length; i++) {
    if (assigned.has(i)) continue
    assigned.add(i)
    const group: OcrBlock[] = [boxed[i]]
    let groupBox = boxed[i].bbox as BBox
    for (let j = i + 1; j < boxed.length; j++) {
      if (assigned.has(j)) continue
      const candidate = boxed[j]
      if (candidate.page !== boxed[i].page) continue
      if (verticalOverlapRatio(groupBox, candidate.bbox as BBox) < overlapThreshold) continue
      group.push(candidate)
      groupBox = unionBox(groupBox, candidate.bbox as BBox)
      assigned.add(j)
    }
    groups.push(group)
  }

  const merged: OcrBlock[] = []
  for (const group of groups) {
    const ordered = [...group].sort((a, b) => (a.bbox as BBox)[0] - (b.bbox as BBox)[0])
    const confidences = ordered
      .map((b) => b.confidence)
      .filter((c): c is number => typeof c === 'number')
    const line: OcrBlock = {
      text: ordered.map((b) => b.text.trim()).join(' '),
      page: ordered[0]?.page ?? 1,
      bbox: ordered.reduce<BBox>(
        (acc, b) => unionBox(acc, b.bbox as BBox),
        [...(ordered[0]?.bbox as BBox)],
      ),
    }
    if (confidences.length === ordered.length && confidences.length > 0) {
      line.confidence = Math.min(...confidences)
    }
    merged.push(line)
  }

  const result = [...merged, ...unboxed]
  result.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page
    const ay = a.bbox?.[1] ?? Number.MAX_SAFE_INTEGER
    const by = b.bbox?.[1] ?? Number.MAX_SAFE_INTEGER
    if (ay !== by) return ay - by
    return (a.bbox?.[0] ?? 0) - (b.bbox?.[0] ?? 0)
  })
  return result
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
