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

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
const currencyCode = z.string().regex(/^[A-Za-z]{3}$/, 'must be a 3-letter currency code')
const amount = z.coerce.number().nonnegative()

export const lineItemSchema = z.object({
  description: fieldOf(z.string()),
  quantity: fieldOf(amount),
})
export type LineItemExtraction = z.infer<typeof lineItemSchema>

export const invoiceLineItemSchema = lineItemSchema.extend({
  unitPrice: fieldOf(amount),
  total: fieldOf(amount),
})
export type InvoiceLineItemExtraction = z.infer<typeof invoiceLineItemSchema>

export const commercialInvoiceSchema = z.object({
  invoiceNumber: fieldOf(z.string()).optional(),
  sellerName: fieldOf(z.string()),
  buyerName: fieldOf(z.string()),
  currencyCode: fieldOf(currencyCode),
  lineItems: z.array(invoiceLineItemSchema).min(1),
  grandTotal: fieldOf(amount),
  shipmentDate: fieldOf(isoDate).optional(),
  beneficiaryAccount: fieldOf(z.string()).optional(),
})
export type CommercialInvoiceExtraction = z.infer<typeof commercialInvoiceSchema>

export const letterOfCreditSchema = z.object({
  lcNumber: fieldOf(z.string()).optional(),
  applicantName: fieldOf(z.string()),
  beneficiaryName: fieldOf(z.string()),
  amount: fieldOf(amount),
  currencyCode: fieldOf(currencyCode),
  latestShipmentDate: fieldOf(isoDate),
  expiryDate: fieldOf(isoDate).optional(),
  requiredDocuments: z.array(fieldOf(z.string())).min(1),
})
export type LetterOfCreditExtraction = z.infer<typeof letterOfCreditSchema>

export const packingListSchema = z.object({
  listNumber: fieldOf(z.string()).optional(),
  shipperName: fieldOf(z.string()),
  consigneeName: fieldOf(z.string()).optional(),
  lineItems: z.array(lineItemSchema).min(1),
})
export type PackingListExtraction = z.infer<typeof packingListSchema>

export const billOfLadingSchema = z.object({
  bolNumber: fieldOf(z.string()).optional(),
  shipperName: fieldOf(z.string()),
  carrierName: fieldOf(z.string()),
  shippedOnBoardDate: fieldOf(isoDate),
  portOfLoading: fieldOf(z.string()).optional(),
  portOfDischarge: fieldOf(z.string()).optional(),
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
