import { baseFinding, evidence, namesMatch, numbersClose, type RuleContext, type DiscrepancyRule } from './engine.js'
import { QUANTITY_TOLERANCE } from '../config.js'
import type { Finding } from '../types/findings.js'
import type { LineItemExtraction } from '../types/extraction.js'

function normalizeDescription(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function descriptionsMatch(a: string, b: string): boolean {
  const na = normalizeDescription(a)
  const nb = normalizeDescription(b)
  if (na.length < 4 || nb.length < 4) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

interface PackingItemRef {
  docId: string
  item: LineItemExtraction
}

export const quantityMismatchRule: DiscrepancyRule = {
  id: 'quantity_mismatch',
  evaluate(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const invoices = ctx.extracted.filter((d) => d.docType === 'commercial_invoice')
    if (invoices.length === 0) return findings
    const packingItems: PackingItemRef[] = []
    for (const doc of ctx.extracted) {
      if (doc.docType !== 'packing_list') continue
      for (const item of doc.fields.lineItems) {
        packingItems.push({ docId: doc.docId, item })
      }
    }
    for (const invoice of invoices) {
      for (const line of invoice.fields.lineItems) {
        const invoiceQtyBundle = evidence(ctx, invoice.docId, line.quantity.ref)
        const match = packingItems.find((p) => descriptionsMatch(p.item.description.value, line.description.value))
        if (!match) {
          findings.push(
            baseFinding(
              this.id,
              'HUMAN_REVIEW',
              'LOW',
              `could not match invoice item "${line.description.value}" against any packing-list line`,
              invoiceQtyBundle.sources,
            ),
          )
          continue
        }
        const packingQtyBundle = evidence(ctx, match.docId, match.item.quantity.ref)
        const allSources = [...invoiceQtyBundle.sources, ...packingQtyBundle.sources]
        if (numbersClose(line.quantity.value, match.item.quantity.value, QUANTITY_TOLERANCE)) {
          continue
        }
        findings.push(
          baseFinding(
            this.id,
            'DISCREPANCY',
            'HIGH',
            `quantity mismatch for "${line.description.value}": invoice says ${line.quantity.value}, packing list says ${match.item.quantity.value}`,
            allSources,
            `invoice ${line.quantity.value} ≠ packing list ${match.item.quantity.value} (tolerance ${QUANTITY_TOLERANCE})`,
          ),
        )
      }
    }
    return findings
  },
}
