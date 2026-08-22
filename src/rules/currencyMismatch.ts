import { baseFinding, evidence, type RuleContext, type DiscrepancyRule } from './engine.js'
import type { Finding } from '../types/findings.js'

export const currencyMismatchRule: DiscrepancyRule = {
  id: 'currency_mismatch',
  evaluate(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const observed: { docId: string; code: string; refs: number[] }[] = []
    for (const doc of ctx.extracted) {
      if (doc.docType === 'letter_of_credit') {
        observed.push({ docId: doc.docId, code: doc.fields.currencyCode.value.toUpperCase(), refs: doc.fields.currencyCode.ref })
      }
      if (doc.docType === 'commercial_invoice') {
        observed.push({ docId: doc.docId, code: doc.fields.currencyCode.value.toUpperCase(), refs: doc.fields.currencyCode.ref })
      }
    }
    const distinct = new Set(observed.map((o) => o.code))
    if (distinct.size < 2) return findings
    const sources = observed.flatMap((o) => evidence(ctx, o.docId, o.refs).sources)
    const listing = observed.map((o) => `${o.code} (${o.docId})`).join(' vs ')
    findings.push(
      baseFinding(
        this.id,
        'DISCREPANCY',
        'HIGH',
        `documents disagree on currency: ${listing}`,
        sources,
        `distinct currencies found: ${[...distinct].join(', ')}`,
      ),
    )
    return findings
  },
}
