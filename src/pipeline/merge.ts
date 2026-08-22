import { schemaForDocType } from '../types/extraction.js'
import type { ExtractedDocument } from '../types/extraction.js'
import type { DocType } from '../types/documents.js'

export function mergePartialExtractions(
  partials: readonly unknown[],
): Record<string, unknown> {
  let acc: Record<string, unknown> = {}
  for (const partial of partials) {
    if (isPlainObject(partial)) {
      acc = mergeObjects(acc, partial)
    }
  }
  return acc
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function mergeObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a }
  for (const [key, bValue] of Object.entries(b)) {
    const aValue = out[key]
    if (Array.isArray(aValue) && Array.isArray(bValue)) {
      out[key] = [...aValue, ...bValue]
    } else if (isPlainObject(aValue) && isPlainObject(bValue)) {
      out[key] = mergeObjects(aValue, bValue)
    } else if (aValue === undefined) {
      out[key] = bValue
    }
  }
  return out
}

export function wrapExtractedDocument(
  docId: string,
  docType: DocType,
  merged: Record<string, unknown>,
): ExtractedDocument | null {
  const check = schemaForDocType(docType).safeParse(merged)
  if (!check.success) {
    return null
  }
  const fields = check.data as Record<string, unknown>
  switch (docType) {
    case 'commercial_invoice':
      return { docId, docType: 'commercial_invoice', fields: fields as never }
    case 'letter_of_credit':
      return { docId, docType: 'letter_of_credit', fields: fields as never }
    case 'packing_list':
      return { docId, docType: 'packing_list', fields: fields as never }
    case 'bill_of_lading':
      return { docId, docType: 'bill_of_lading', fields: fields as never }
  }
}
