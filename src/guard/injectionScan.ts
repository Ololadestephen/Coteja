import { INJECTION_PATTERNS } from './patterns.js'
import type { InjectionFlag } from './patterns.js'
import type { OcrBlock } from '../types/ocr.js'

interface BlockSpan {
  start: number
  end: number
  blockIndex: number
}

export function scanBlocksForInjections(
  docId: string,
  blocks: readonly OcrBlock[],
): InjectionFlag[] {
  const flags: InjectionFlag[] = []
  if (blocks.length === 0) return flags

  let joined = ''
  const spans: BlockSpan[] = []
  blocks.forEach((block, blockIndex) => {
    const start = joined.length
    joined += `${block.text}\n`
    spans.push({ start, end: joined.length, blockIndex })
  })

  const flagged = new Set<string>()
  for (const pattern of INJECTION_PATTERNS) {
    const global = new RegExp(
      pattern.regex.source,
      pattern.regex.flags.includes('g') ? pattern.regex.flags : `${pattern.regex.flags}g`,
    )
    let match: RegExpExecArray | null
    while ((match = global.exec(joined)) !== null) {
      if (match[0].length === 0) {
        global.lastIndex += 1
        continue
      }
      const position = match.index
      const matchEnd = position + match[0].length
      const affectedSpans = spans.filter((span) => position < span.end && matchEnd > span.start)
      if (affectedSpans.length === 0) continue
      const from = Math.max(0, position - 24)
      const to = Math.min(joined.length, position + match[0].length + 24)
      for (const span of affectedSpans) {
        const key = `${pattern.id}:${span.blockIndex}`
        if (flagged.has(key)) continue
        flagged.add(key)
        const page = blocks[span.blockIndex]?.page ?? 1
        flags.push({
          docId,
          blockIndex: span.blockIndex,
          page,
          matchedPattern: pattern.id,
          excerpt: joined.slice(from, to).replace(/\n+/g, ' ').trim(),
          action: 'redacted_before_extraction',
        })
      }
    }
  }
  return flags
}

export function redactFlaggedBlocks(
  docId: string,
  blocks: readonly OcrBlock[],
  flags: readonly InjectionFlag[],
): OcrBlock[] {
  const patternsByBlock = new Map<number, Set<string>>()
  for (const flag of flags) {
    if (flag.docId !== docId) continue
    const patterns = patternsByBlock.get(flag.blockIndex) ?? new Set<string>()
    patterns.add(flag.matchedPattern)
    patternsByBlock.set(flag.blockIndex, patterns)
  }
  return blocks.map((block, blockIndex) => {
    const patterns = patternsByBlock.get(blockIndex)
    if (patterns === undefined) return { ...block }
    return {
      ...block,
      text: `[UNTRUSTED CONTENT REDACTED BEFORE EXTRACTION: ${[...patterns].sort().join(', ')}]`,
    }
  })
}
