import type { EvidencePacket, Verdict } from '../types/packet.js'
import type { Finding } from '../types/findings.js'

export function renderMarkdownPacket(packet: EvidencePacket): string {
  const lines: string[] = []
  lines.push(`# Coteja — evidence packet: ${packet.dossierId}`)
  lines.push('')
  lines.push(`**Verdict:** ${packet.verdict}`)
  lines.push(`**Generated:** ${packet.generatedAtIso} · fully local inference`)
  lines.push(
    `**Model:** ${packet.run.modelLabel} (${packet.run.quantization}, ctx ${packet.run.ctxSize}) on ${packet.run.hardware}`,
  )
  lines.push('')

  if (packet.injectionFlags.length > 0) {
    lines.push('## ⚠️ Untrusted-content flags')
    for (const flag of packet.injectionFlags) {
      lines.push(
        `- \`${flag.matchedPattern}\` in ${flag.docId} p${flag.page} (block ${flag.blockIndex}): “…${flag.excerpt}…” — redacted before local-model extraction and retained as an audit flag.`,
      )
    }
    lines.push('')
  }

  if (packet.findings.length === 0) {
    lines.push('No discrepancies and no review items. All deterministic checks passed.')
    lines.push('')
  }

  const discrepancies = packet.findings.filter((f) => f.status === 'DISCREPANCY')
  const reviews = packet.findings.filter((f) => f.status === 'HUMAN_REVIEW')

  if (discrepancies.length > 0) {
    lines.push(`## Discrepancies (${discrepancies.length})`)
    for (const finding of discrepancies) {
      lines.push(...renderFinding(finding))
    }
  }
  if (reviews.length > 0) {
    lines.push(`## Needs human review (${reviews.length})`)
    for (const finding of reviews) {
      lines.push(...renderFinding(finding))
    }
  }

  lines.push('## Reliability')
  lines.push(
    `- stages (ms): ocr ${packet.timings.ocr} · extraction ${packet.timings.extraction} · controls ${packet.timings.controls} · evidence lock ${packet.timings.evidenceLock}`,
  )
  if (packet.run.tokensPerSecond.length > 0) {
    const sorted = [...packet.run.tokensPerSecond].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    lines.push(`- median local generation speed: ${median?.toFixed(1)} tok/s over ${sorted.length} calls`)
  }
  lines.push(
    `- docs checked: ${packet.stats.docsChecked} · extraction repairs: ${packet.stats.repairsUsed} · human-review items: ${packet.stats.humanReviews}`,
  )
  lines.push('')
  lines.push('_Every discrepancy above carries resolvable source evidence and a deterministic comparison; otherwise it is human review._')
  return lines.join('\n')
}

function renderFinding(finding: Finding): string[] {
  const lines: string[] = []
  lines.push('')
  lines.push(`### ${finding.id} — ${finding.message}`)
  lines.push(`severity: **${finding.severity}**`)
  if (finding.calculation !== undefined) {
    lines.push(`check: \`${finding.calculation}\``)
  }
  if (finding.reviewReason !== undefined) {
    lines.push(`review reason: ${finding.reviewReason}`)
  }
  if (finding.evidence.length === 0) {
    lines.push('_no machine-resolvable evidence — verify manually_')
  }
  for (const source of finding.evidence) {
    const conf =
      source.ocrConfidence !== undefined ? ` · OCR confidence ${(source.ocrConfidence * 100).toFixed(1)}%` : ''
    const box = source.bbox !== undefined ? ` · bbox [${source.bbox.map((n) => Math.round(n)).join(', ')}]` : ''
    lines.push(`- ${source.docId} p${source.page}${conf}${box}: “${source.quote}”`)
  }
  lines.push(`provenance: ${finding.provenance.join(' → ')}`)
  lines.push('')
  return lines
}
