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

  const flagged = new Set<number>()
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
      const span = spans.find((s) => position >= s.start && position < s.end)
      if (span === undefined || flagged.has(span.blockIndex)) continue
      flagged.add(span.blockIndex)
      const from = Math.max(0, position - 24)
      const to = Math.min(joined.length, position + match[0].length + 24)
      const page = blocks[span.blockIndex]?.page ?? 1
      flags.push({
        docId,
        blockIndex: span.blockIndex,
        page,
        matchedPattern: pattern.id,
        excerpt: joined.slice(from, to).replace(/\n+/g, ' ').trim(),
        action: 'quarantined',
      })
    }
  }
  return flags
}
