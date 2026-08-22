import {
  billOfLadingSchema,
  commercialInvoiceSchema,
  invoiceLineItemSchema,
  letterOfCreditSchema,
  lineItemSchema,
  packingListSchema,
} from './types/extraction.js'
import { mergePartialExtractions } from './pipeline/merge.js'

const field = (value: unknown, quote: string, ref: unknown[]) => ({ value, quote, ref })

export function runSelfTest(): void {
  let failures = 0
  const expect = (label: string, condition: boolean): void => {
    process.stdout.write(`${condition ? '✓' : '✖'} ${label}\n`)
    if (!condition) failures += 1
  }

  expect(
    'valid invoice passes schema',
    commercialInvoiceSchema.safeParse({
      invoiceNumber: field('CI-118', 'CI-118', [0]),
      sellerName: field('Andina Export S.A.', 'Andina Export S.A.', [1]),
      buyerName: field('Global Import GmbH', 'Global Import GmbH', [2]),
      currencyCode: field('USD', 'USD', [3]),
      lineItems: [
        {
          description: field('Malting barley', 'Malting barley', [4]),
          quantity: field(1200, '1200', [4]),
          unitPrice: field(210.5, '210.50', [4]),
          total: field(252600, '252,600.00', [5]),
        },
      ],
      grandTotal: field(252600, 'USD 252,600.00', [6]),
    }).success,
  )

  expect(
    'invoice with empty lineItems is rejected',
    !commercialInvoiceSchema.safeParse({
      sellerName: field('x'.repeat(8), 'x', [0]),
      buyerName: field('y'.repeat(8), 'y', [1]),
      currencyCode: field('USD', 'USD', [2]),
      lineItems: [],
      grandTotal: field(1, '1', [3]),
    }).success,
  )

  expect(
    'bad date format rejected',
    !letterOfCreditSchema.safeParse({
      applicantName: field('Buyer Co', 'Buyer Co', [0]),
      beneficiaryName: field('Seller Co', 'Seller Co', [1]),
      amount: field(100000, '100000', [2]),
      currencyCode: field('EUR', 'EUR', [3]),
      latestShipmentDate: field('31/04/2026', '31/04/2026', [4]),
      requiredDocuments: [field('Invoice', 'Invoice', [5])],
    }).success,
  )

  const coerced = lineItemSchema.safeParse({
    description: field('Malting barley', 'Malting barley', ['7']),
    quantity: field('1200', '1200', [8]),
  })
  expect(
    'stringified numbers and refs are coerced deterministically',
    coerced.success && JSON.stringify(coerced.success ? coerced.data : {}).includes('"value":1200'),
  )

  expect(
    'field with empty refs accepted by schema (evidence lock downgrades later)',
    lineItemSchema.safeParse({ description: field('x'.repeat(6), 'x', []), quantity: field(1, '1', []) }).success,
  )

  expect(
    'valid packing list passes',
    packingListSchema.safeParse({
      shipperName: field('Andina Export S.A.', 'Andina Export S.A.', [0]),
      lineItems: [{ description: field('Malting barley', 'Malting barley', [1]), quantity: field(1200, '1200', [1]) }],
    }).success,
  )

  expect(
    'valid bill of lading passes',
    billOfLadingSchema.safeParse({
      shipperName: field('Andina Export S.A.', 'Andina Export S.A.', [0]),
      carrierName: field('MSC', 'MSC', [1]),
      shippedOnBoardDate: field('2026-05-02', '02 MAY 2026', [2]),
    }).success,
  )

  const a = {
    sellerName: { value: 'A', quote: 'A', ref: [0] },
    lineItems: [{ description: { value: 'x', quote: 'x', ref: [1] } }],
  }
  const b = {
    buyerName: { value: 'B', quote: 'B', ref: [2] },
    lineItems: [{ description: { value: 'y', quote: 'y', ref: [3] } }],
  }
  const merged = mergePartialExtractions([a, b])
  const mergedLines = merged.lineItems as unknown[]
  expect(
    'chunk merge concatenates arrays and unions keys',
    Array.isArray(mergedLines) &&
      mergedLines.length === 2 &&
      typeof merged.buyerName === 'object' &&
      typeof merged.sellerName === 'object',
  )

  if (failures > 0) {
    process.stdout.write(`\nselftest FAILED (${failures})\n`)
    process.exit(1)
  }
  process.stdout.write('\nselftest passed — schemas and merge behave as designed\n')
}
