import { z } from 'zod'
import type { DocType } from './documents.js'

export interface Provenance {
  docId: string
  blockIndex: number
}

const fieldOf = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    value,
    quote: z.string(),
    ref: z.array(z.coerce.number().int().nonnegative()),
  })

const isoDate = z.preprocess(
  (v) => {
    if (typeof v === 'number') {
      const digits = String(v)
      if (/^\d{8}$/.test(digits)) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
      }
      return v
    }
    if (typeof v === 'string') {
      const parts = v.trim().match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
      if (parts) {
        return `${parts[1]}-${parts[2]?.padStart(2, '0')}-${parts[3]?.padStart(2, '0')}`
      }
    }
    return v
  },
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
)
const currencyCode = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
  z.string().regex(/^[A-Z]{3}$/, 'must be a 3-letter currency code'),
)

const amount = z.preprocess(
  (v) => {
    if (typeof v === 'string') {
      const commaCleaned = v.replace(/,(?=\d{3}\b)/g, '')
      const firstNumber = commaCleaned.match(/-?\d+(?:\.\d+)?/)
      return firstNumber ? firstNumber[0] : v
    }
    return v
  },
  z.coerce.number().nonnegative(),
)

const text = z.preprocess((v) => (typeof v === 'number' ? String(v) : v), z.string())

export const lineItemSchema = z.object({
  description: fieldOf(text),
  quantity: fieldOf(amount),
})
export type LineItemExtraction = z.infer<typeof lineItemSchema>

export const invoiceLineItemSchema = lineItemSchema.extend({
  unitPrice: fieldOf(amount),
  total: fieldOf(amount),
})
export type InvoiceLineItemExtraction = z.infer<typeof invoiceLineItemSchema>

export const commercialInvoiceSchema = z.object({
  invoiceNumber: fieldOf(text).optional(),
  sellerName: fieldOf(text),
  buyerName: fieldOf(text),
  currencyCode: fieldOf(currencyCode),
  lineItems: z.array(invoiceLineItemSchema).min(1),
  grandTotal: fieldOf(amount),
  shipmentDate: fieldOf(isoDate).optional(),
  beneficiaryAccount: fieldOf(text).optional(),
})
export type CommercialInvoiceExtraction = z.infer<typeof commercialInvoiceSchema>

export const letterOfCreditSchema = z.object({
  lcNumber: fieldOf(text).optional(),
  applicantName: fieldOf(text),
  beneficiaryName: fieldOf(text),
  amount: fieldOf(amount),
  currencyCode: fieldOf(currencyCode),
  latestShipmentDate: fieldOf(isoDate),
  expiryDate: fieldOf(isoDate).optional(),
  requiredDocuments: z.array(fieldOf(text)).min(1),
})
export type LetterOfCreditExtraction = z.infer<typeof letterOfCreditSchema>

export const packingListSchema = z.object({
  listNumber: fieldOf(text).optional(),
  shipperName: fieldOf(text),
  consigneeName: fieldOf(text).optional(),
  lineItems: z.array(lineItemSchema).min(1),
})
export type PackingListExtraction = z.infer<typeof packingListSchema>

export const billOfLadingSchema = z.object({
  bolNumber: fieldOf(text).optional(),
  shipperName: fieldOf(text),
  carrierName: fieldOf(text),
  shippedOnBoardDate: fieldOf(isoDate),
  portOfLoading: fieldOf(text).optional(),
  portOfDischarge: fieldOf(text).optional(),
})
export type BillOfLadingExtraction = z.infer<typeof billOfLadingSchema>

export type ExtractedDocument =
  | { docId: string; docType: 'commercial_invoice'; fields: CommercialInvoiceExtraction }
  | { docId: string; docType: 'letter_of_credit'; fields: LetterOfCreditExtraction }
  | { docId: string; docType: 'packing_list'; fields: PackingListExtraction }
  | { docId: string; docType: 'bill_of_lading'; fields: BillOfLadingExtraction }

export interface ExtractionOutcome {
  docId: string
  status: 'extracted' | 'needs_human_review'
  document?: ExtractedDocument
  reason?: string
}

export function schemaForDocType(docType: DocType): z.ZodTypeAny {
  switch (docType) {
    case 'commercial_invoice':
      return commercialInvoiceSchema
    case 'letter_of_credit':
      return letterOfCreditSchema
    case 'packing_list':
      return packingListSchema
    case 'bill_of_lading':
      return billOfLadingSchema
  }
}
