import { INJECTION_PATTERNS } from './patterns.js'
import type { InjectionFlag } from './patterns.js'
import type { OcrBlock } from '../types/ocr.js'

export function scanBlocksForInjections(
  docId: string,
  blocks: readonly OcrBlock[],
): InjectionFlag[] {
  const flags: InjectionFlag[] = []
  blocks.forEach((block, blockIndex) => {
    for (const pattern of INJECTION_PATTERNS) {
      const match = block.text.match(pattern.regex)
      if (match === null || match.index === undefined) continue
      const from = Math.max(0, match.index - 24)
      const to = Math.min(block.text.length, match.index + match[0].length + 24)
      flags.push({
        docId,
        blockIndex,
        page: block.page,
        matchedPattern: pattern.id,
        excerpt: block.text.slice(from, to).trim(),
        action: 'quarantined',
      })
      break
    }
  })
  return flags
}
