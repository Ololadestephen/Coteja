import type { EvidencePacket } from '../types/packet.js'
import type { GroundTruth } from '../dossier/loadDossier.js'

export interface DossierRunMetrics {
  runIndex: number
  verdict: EvidencePacket['verdict']
  verdictCorrect: boolean
  precision: number | null
  recall: number | null
  unexpectedRuleRate: number
  humanReviews: number
  ruleFailures: number
  totalMs: number
}

function safeDiv(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return numerator / denominator
}

export function scorePacket(
  packet: EvidencePacket,
  groundTruth: GroundTruth | null,
  runIndex: number,
  ruleFailures: number,
): DossierRunMetrics {
  const discrepancies = packet.findings.filter((f) => f.status === 'DISCREPANCY')
  const detected = new Set(discrepancies.map((f) => f.ruleId))
  if (groundTruth === null) {
    return {
      runIndex,
      verdict: packet.verdict,
      verdictCorrect: false,
      precision: null,
      recall: null,
      unexpectedRuleRate: 0,
      humanReviews: packet.stats.humanReviews,
      ruleFailures,
      totalMs: packet.timings.total,
    }
  }
  const expected = new Set(groundTruth.expectedDiscrepancyRules)
  let tp = 0
  for (const ruleId of detected) {
    if (expected.has(ruleId)) tp += 1
  }
  const fp = detected.size - tp
  const fn = expected.size - tp
  return {
    runIndex,
    verdict: packet.verdict,
    verdictCorrect: packet.verdict === groundTruth.expectedVerdict,
    precision: safeDiv(tp, tp + fp),
    recall: safeDiv(tp, tp + fn),
    unexpectedRuleRate: discrepancies.length === 0 ? 0 : fp / discrepancies.length,
    humanReviews: packet.stats.humanReviews,
    ruleFailures,
    totalMs: packet.timings.total,
  }
}
