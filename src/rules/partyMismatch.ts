import { baseFinding, evidence, namesMatch, type RuleContext, type DiscrepancyRule } from './engine.js'
import type { Finding } from '../types/findings.js'

interface PartyRef {
  docId: string
  role: string
  name: string
  refs: number[]
}

export const partyMismatchRule: DiscrepancyRule = {
  id: 'party_mismatch',
  evaluate(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const parties: PartyRef[] = []
    for (const doc of ctx.extracted) {
      if (doc.docType === 'letter_of_credit') {
        parties.push({ docId: doc.docId, role: 'credit beneficiary', name: doc.fields.beneficiaryName.value, refs: doc.fields.beneficiaryName.ref })
        parties.push({ docId: doc.docId, role: 'credit applicant', name: doc.fields.applicantName.value, refs: doc.fields.applicantName.ref })
      }
      if (doc.docType === 'commercial_invoice') {
        if (doc.fields.sellerName !== undefined) {
          parties.push({ docId: doc.docId, role: 'invoice seller', name: doc.fields.sellerName.value, refs: doc.fields.sellerName.ref })
        }
        if (doc.fields.buyerName !== undefined) {
          parties.push({ docId: doc.docId, role: 'invoice buyer', name: doc.fields.buyerName.value, refs: doc.fields.buyerName.ref })
        }
      }
      if (doc.docType === 'packing_list' && doc.fields.shipperName !== undefined) {
        parties.push({ docId: doc.docId, role: 'packing-list shipper', name: doc.fields.shipperName.value, refs: doc.fields.shipperName.ref })
      }
      if (doc.docType === 'bill_of_lading' && doc.fields.shipperName !== undefined) {
        parties.push({ docId: doc.docId, role: 'bill-of-lading shipper', name: doc.fields.shipperName.value, refs: doc.fields.shipperName.ref })
      }
    }

    const beneficiary = parties.find((p) => p.role === 'credit beneficiary')
    const invoiceSeller = parties.find((p) => p.role === 'invoice seller')
    const bolShipper = parties.find((p) => p.role.startsWith('bill-of-lading'))
    const applicant = parties.find((p) => p.role === 'credit applicant')
    const invoiceBuyer = parties.find((p) => p.role === 'invoice buyer')

    const pairs: [PartyRef | undefined, PartyRef | undefined][] = [
      [beneficiary, invoiceSeller],
      [beneficiary, bolShipper],
      [applicant, invoiceBuyer],
    ]
    for (const [a, b] of pairs) {
      if (a === undefined || b === undefined) continue
      if (namesMatch(a.name, b.name)) continue
      findings.push(
        baseFinding(
          this.id,
          'DISCREPANCY',
          'MEDIUM',
          `party mismatch: ${a.role} "${a.name}" (${a.docId}) does not match ${b.role} "${b.name}" (${b.docId})`,
          [...evidence(ctx, a.docId, a.refs).sources, ...evidence(ctx, b.docId, b.refs).sources],
          `"${a.name}" vs "${b.name}"`,
        ),
      )
    }

    const shippers = parties.filter((p) => p.role.includes('shipper'))
    for (let i = 1; i < shippers.length; i++) {
      const a = shippers[i - 1]
      const b = shippers[i]
      if (namesMatch(a.name, b.name)) continue
      findings.push(
        baseFinding(
          this.id,
          'DISCREPANCY',
          'MEDIUM',
          `party mismatch: ${a.role} "${a.name}" (${a.docId}) does not match ${b.role} "${b.name}" (${b.docId})`,
          [...evidence(ctx, a.docId, a.refs).sources, ...evidence(ctx, b.docId, b.refs).sources],
          `"${a.name}" vs "${b.name}"`,
        ),
      )
    }
    return findings
  },
}
