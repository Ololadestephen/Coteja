import type { Finding } from '../types/findings.js'

export interface EvidenceLockResult {
  locked: Finding[]
  downgradedCount: number
}

export function applyEvidenceLock(findings: readonly Finding[]): EvidenceLockResult {
  let downgradedCount = 0
  const locked = findings.map((finding) => {
    const problems: string[] = []
    if (finding.evidence.length === 0) {
      problems.push('no resolvable source evidence')
    }
    if (finding.provenance.length < 2) {
      problems.push('incomplete provenance trail')
    }
    if (finding.status === 'DISCREPANCY' && (finding.calculation === undefined || finding.calculation.trim().length === 0)) {
      problems.push('missing deterministic calculation or comparison')
    }
    if (problems.length === 0) return finding
    if (finding.status === 'DISCREPANCY') {
      downgradedCount += 1
      return {
        ...finding,
        status: 'HUMAN_REVIEW' as const,
        reviewReason: `evidence lock: ${problems.join('; ')}`,
      }
    }
    return {
      ...finding,
      reviewReason:
        finding.reviewReason !== undefined
          ? `${finding.reviewReason}; evidence lock notes: ${problems.join('; ')}`
          : `evidence lock notes: ${problems.join('; ')}`,
    }
  })
  return { locked, downgradedCount }
}
