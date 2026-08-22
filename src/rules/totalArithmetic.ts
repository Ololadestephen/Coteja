import { baseFinding, evidence, type RuleContext, type DiscrepancyRule } from './engine.js'
import type { Finding } from '../types/findings.js'

export const totalArithmeticRule: DiscrepancyRule = {
  id: 'total_arithmetic',
  evaluate(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const invoices = ctx.extracted.filter((d) => d.docType === 'commercial_invoice')
    for (const invoice of invoices) {
      for (const line of invoice.fields.lineItems) {
        const expected = line.quantity.value * line.unitPrice.value
        const tolerance = Math.max(0.01, Math.abs(line.total.value) * 0.01)
        if (Math.abs(expected - line.total.value) <= tolerance) continue
        findings.push(
          baseFinding(
            this.id,
            'DISCREPANCY',
            'MEDIUM',
            `line "${line.description.value}" does not add up: ${line.quantity.value} × ${line.unitPrice.value} ≠ ${line.total.value}`,
            [
              ...evidence(ctx, invoice.docId, [...line.quantity.ref, ...line.unitPrice.ref]).sources,
              ...evidence(ctx, invoice.docId, line.total.ref).sources,
            ],
            `${line.quantity.value} × ${line.unitPrice.value} = ${round2(expected)} ≠ stated ${line.total.value} (tolerance ${round2(tolerance)})`,
          ),
        )
      }
      const sumLines = invoice.fields.lineItems.reduce((acc, l) => acc + l.total.value, 0)
      const grandTotal = invoice.fields.grandTotal.value
      const grandTolerance = Math.max(0.01, Math.abs(grandTotal) * 0.01)
      if (Math.abs(sumLines - grandTotal) > grandTolerance) {
        findings.push(
          baseFinding(
            this.id,
            'DISCREPANCY',
            'HIGH',
            `stated grand total ${grandTotal} does not match the sum of line totals ${round2(sumLines)}`,
            [
              ...invoice.fields.lineItems.flatMap((l) => evidence(ctx, invoice.docId, l.total.ref).sources),
              ...evidence(ctx, invoice.docId, invoice.fields.grandTotal.ref).sources,
            ],
            `Σ lines = ${round2(sumLines)} ≠ stated grand total ${grandTotal}`,
          ),
        )
      }
    }
    return findings
  },
}

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}
