import { z } from 'zod'
import { completeOnce } from './load.js'
import { schemaForDocType } from '../types/extraction.js'
import { normalizeModelObject } from '../pipeline/modelOutput.js'
import type { CompletionOutcome } from './load.js'
import type { DocType } from '../types/documents.js'

export const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction engine embedded in a trade-finance checking tool. You never decide anything, never approve anything and never give opinions. Your only job is to convert numbered OCR blocks from ONE document into a single JSON object.

Rules:
- Use ONLY information present in the numbered blocks.
- Every extracted field is an object: {"value": <the value>, "quote": <exact substring copied from a block>, "ref": [<block numbers>]}.
- quote MUST be copied character-for-character from one of the blocks.
- ref lists the block numbers the value came from (the [N] prefixes). Integers only, e.g. [3] not ["3"].
- Numbers are JSON numbers, never strings: write 252600.00 or 1200, not "252600.00" or "1200".
- Dates use YYYY-MM-DD. Currency uses its 3-letter code (USD, EUR, ARS...).
- If a value is not in the document, omit that optional field entirely. Never invent values and never emit empty fields.
- lineItems contains ONLY goods lines from the document's Items section. Each "Item N ..." block is exactly one item. Never treat totals, grand totals, package counts or summary lines as items.
- Output exactly one JSON object and nothing else. No markdown, no explanations.`

const FIELD_SHAPE = '{"value": ..., "quote": "...", "ref": [blockNumbers]}'

const SHAPE_INSTRUCTIONS: Record<DocType, string> = {
  commercial_invoice: `Shape for a COMMERCIAL INVOICE:
{
  "invoiceNumber": ${FIELD_SHAPE} (optional),
  "sellerName": ${FIELD_SHAPE},
  "buyerName": ${FIELD_SHAPE},
  "currencyCode": ${FIELD_SHAPE},
  "lineItems": [{"description": ${FIELD_SHAPE}, "quantity": ${FIELD_SHAPE}, "unitPrice": ${FIELD_SHAPE}, "total": ${FIELD_SHAPE}}] (at least 1),
  "grandTotal": ${FIELD_SHAPE},
  "shipmentDate": ${FIELD_SHAPE} (optional),
  "beneficiaryAccount": ${FIELD_SHAPE} (optional)
}`,
  letter_of_credit: `Shape for a LETTER OF CREDIT:
{
  "lcNumber": ${FIELD_SHAPE} (optional),
  "applicantName": ${FIELD_SHAPE},
  "beneficiaryName": ${FIELD_SHAPE},
  "amount": ${FIELD_SHAPE},
  "currencyCode": ${FIELD_SHAPE},
  "latestShipmentDate": ${FIELD_SHAPE},
  "expiryDate": ${FIELD_SHAPE} (optional),
  "requiredDocuments": [${FIELD_SHAPE}] (documents the credit demands, at least 1)
}`,
  packing_list: `Shape for a PACKING LIST:
{
  "listNumber": ${FIELD_SHAPE} (optional),
  "shipperName": ${FIELD_SHAPE},
  "consigneeName": ${FIELD_SHAPE} (optional),
  "lineItems": [{"description": ${FIELD_SHAPE}, "quantity": ${FIELD_SHAPE}}] (at least 1)
}`,
  bill_of_lading: `Shape for a BILL OF LADING:
{
  "bolNumber": ${FIELD_SHAPE} (optional),
  "shipperName": ${FIELD_SHAPE},
  "carrierName": ${FIELD_SHAPE},
  "shippedOnBoardDate": ${FIELD_SHAPE},
  "portOfLoading": ${FIELD_SHAPE} (optional),
  "portOfDischarge": ${FIELD_SHAPE} (optional)
}`,
}

export function buildExtractionUserPrompt(
  docType: DocType,
  numberedBlocks: readonly string[],
): string {
  return [
    SHAPE_INSTRUCTIONS[docType],
    '',
    'Numbered OCR blocks of the document:',
    ...numberedBlocks,
    '',
    'Remember: output exactly one JSON object, nothing else.',
  ].join('\n')
}

export function buildRepairUserPrompt(
  docType: DocType,
  sourcePrompt: string,
  previousOutput: string,
  validationError: string,
): string {
  return [
    `Your previous answer for this ${docType.replace(/_/g, ' ')} was invalid.`,
    '',
    'Validation error:',
    validationError,
    '',
    'Original requested shape and numbered OCR blocks:',
    sourcePrompt,
    '',
    'Your previous answer:',
    previousOutput.slice(0, 2000),
    '',
    'Fix the problem and output exactly one valid JSON object matching the requested shape. Copy quotes exactly from the numbered blocks.',
  ].join('\n')
}

export interface ValidatedExtraction {
  ok: boolean
  value?: unknown
  error?: string
  raw: string
  usedRepair: boolean
  tokensPerSecondSample?: number
}

export async function extractAndValidateChunk(
  modelId: string,
  docType: DocType,
  userPrompt: string,
): Promise<ValidatedExtraction> {
  const schema = schemaForDocType(docType)
  const first: CompletionOutcome = await completeOnce(
    modelId,
    EXTRACTION_SYSTEM_PROMPT,
    userPrompt,
  )
  const firstParsed = asObject(normalizeModelObject(looseParseJsonObject(first.text)))
  if (firstParsed !== null) {
    const check = schema.safeParse(firstParsed)
    if (check.success) {
      return {
        ok: true,
        value: check.data,
        raw: first.text,
        usedRepair: false,
        tokensPerSecondSample: first.tokensPerSecond,
      }
    }
    const repaired: CompletionOutcome = await completeOnce(
      modelId,
      EXTRACTION_SYSTEM_PROMPT,
      buildRepairUserPrompt(docType, userPrompt, first.text, summarizeZodError(check.error)),
    )
    const repairedParsed = asObject(normalizeModelObject(looseParseJsonObject(repaired.text)))
    if (repairedParsed !== null) {
      const secondCheck = schema.safeParse(repairedParsed)
      if (secondCheck.success) {
        return {
          ok: true,
          value: secondCheck.data,
          raw: repaired.text,
          usedRepair: true,
          tokensPerSecondSample: repaired.tokensPerSecond ?? first.tokensPerSecond,
        }
      }
      return {
        ok: false,
        error: summarizeZodError(secondCheck.error),
        raw: repaired.text,
        usedRepair: true,
        tokensPerSecondSample: first.tokensPerSecond,
      }
    }
    return {
      ok: false,
      error: 'repair attempt did not return JSON',
      raw: repaired.text,
      usedRepair: true,
      tokensPerSecondSample: first.tokensPerSecond,
    }
  }
  const recovered = await completeOnce(
    modelId,
    EXTRACTION_SYSTEM_PROMPT,
    buildRepairUserPrompt(docType, userPrompt, first.text, 'output was not parseable as a JSON object'),
  )
  const recoveredParsed = asObject(normalizeModelObject(looseParseJsonObject(recovered.text)))
  if (recoveredParsed !== null) {
    const check = schema.safeParse(recoveredParsed)
    if (check.success) {
      return {
        ok: true,
        value: check.data,
        raw: recovered.text,
        usedRepair: true,
        tokensPerSecondSample: recovered.tokensPerSecond ?? first.tokensPerSecond,
      }
    }
    return {
      ok: false,
      error: summarizeZodError(check.error),
      raw: recovered.text,
      usedRepair: true,
      tokensPerSecondSample: first.tokensPerSecond,
    }
  }
  return {
    ok: false,
    error: 'model output contained no JSON object',
    raw: first.text,
    usedRepair: true,
    tokensPerSecondSample: first.tokensPerSecond,
  }
}

export function looseParseJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? (fenced[1] ?? '') : text

  for (const parsed of balancedJsonObjects(candidate)) {
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>
    }
  }

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(candidate.slice(start, end + 1))
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

function balancedJsonObjects(text: string): unknown[] {
  const results: unknown[] = []
  let depth = 0
  let inString = false
  let escaped = false
  let objectStart = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') {
      if (depth === 0) objectStart = i
      depth += 1
      continue
    }
    if (ch === '}') {
      depth -= 1
      if (depth === 0 && objectStart >= 0) {
        try {
          results.push(JSON.parse(text.slice(objectStart, i + 1)))
        } catch {
          // skip unparseable candidate
        }
        objectStart = -1
      }
      if (depth < 0) depth = 0
    }
  }
  return results
}

function summarizeZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}
