import type { OcrBlock } from '../types/ocr.js'

export interface GroundingIssue {
  path: string
  reason: string
}

interface FieldLike {
  quote: string
  ref: number[]
}

function isFieldLike(value: unknown): value is FieldLike {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.quote === 'string' &&
    Array.isArray(candidate.ref) &&
    candidate.ref.every((ref) => typeof ref === 'number' && Number.isInteger(ref) && ref >= 0)
  )
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function validateExtractedFieldsGrounding(
  fields: unknown,
  blocks: readonly OcrBlock[],
): GroundingIssue[] {
  const issues: GroundingIssue[] = []

  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    if (isFieldLike(value)) {
      const quote = normalizeWhitespace(value.quote)
      if (quote.length === 0) {
        issues.push({ path, reason: 'quote is empty' })
        return
      }
      if (value.ref.length === 0) {
        issues.push({ path, reason: 'reference list is empty' })
        return
      }
      const referenced = value.ref
        .map((ref) => blocks[ref])
        .filter((block): block is OcrBlock => block !== undefined && block.text.trim().length > 0)
      if (referenced.length !== value.ref.length) {
        issues.push({ path, reason: 'one or more OCR references do not resolve' })
        return
      }
      const candidates = [
        ...referenced.map((block) => normalizeWhitespace(block.text)),
        normalizeWhitespace(referenced.map((block) => block.text).join(' ')),
      ]
      if (!candidates.some((candidate) => candidate.includes(quote))) {
        issues.push({ path, reason: 'quoted text is not present in the referenced OCR block(s)' })
      }
      return
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, path.length === 0 ? key : `${path}.${key}`)
      }
    }
  }

  walk(fields, '')
  return issues
}
