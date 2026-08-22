import { baseFinding, evidence, type RuleContext, type DiscrepancyRule } from './engine.js'
import type { Finding } from '../types/findings.js'

interface ShipmentCandidate {
  docId: string
  label: string
  date: string
  refs: number[]
}

export const shipmentDateRule: DiscrepancyRule = {
  id: 'shipment_date',
  evaluate(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const lcs = ctx.extracted.filter((d) => d.docType === 'letter_of_credit')
    if (lcs.length === 0) return findings
    for (const lc of lcs) {
      const latest = lc.fields.latestShipmentDate
      const lcBundle = evidence(ctx, lc.docId, latest.ref)
      const candidates: ShipmentCandidate[] = []
      for (const doc of ctx.extracted) {
        if (doc.docType === 'commercial_invoice' && doc.fields.shipmentDate !== undefined) {
          candidates.push({
            docId: doc.docId,
            label: 'invoice shipment date',
            date: doc.fields.shipmentDate.value,
            refs: doc.fields.shipmentDate.ref,
          })
        }
        if (doc.docType === 'bill_of_lading' && doc.fields.shippedOnBoardDate !== undefined) {
          candidates.push({
            docId: doc.docId,
            label: 'bill of lading shipped-on-board date',
            date: doc.fields.shippedOnBoardDate.value,
            refs: doc.fields.shippedOnBoardDate.ref,
          })
        }
      }
      for (const candidate of candidates) {
        const candidateBundle = evidence(ctx, candidate.docId, candidate.refs)
        if (candidate.date <= latest.value) continue
        findings.push(
          baseFinding(
            this.id,
            'DISCREPANCY',
            'HIGH',
            `${candidate.label} ${candidate.date} falls after the latest shipment date permitted by the credit (${latest.value})`,
            [...lcBundle.sources, ...candidateBundle.sources],
            `${candidate.date} > ${latest.value}`,
          ),
        )
      }
      if (candidates.length > 0 && lcBundle.unresolvedRefs.length > 0) {
        findings.push(
          baseFinding(
            this.id,
            'HUMAN_REVIEW',
            'LOW',
            'the letter-of-credit latest-shipment-date citation could not be resolved to OCR text; verify manually',
            lcBundle.sources.filter((s) => s.docId === lc.docId),
          ),
        )
      }
    }
    return findings
  },
}
