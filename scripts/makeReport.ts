import { readFileSync } from 'node:fs'

interface DossierSummary {
  dossierId: string
  runsPerDossier: number
  consistency: number
  meanPrecision: number | null
  meanRecall: number | null
  medianTotalMs: number
  ruleFailureRate: number
}

interface BenchFile {
  startedAtIso: string
  model: { label: string; quantization: string; ctxSize: number; hardware: string }
  dossiers: DossierSummary[]
}

const benchPath = process.argv[2] ?? 'reports/bench.json'
const bench = JSON.parse(readFileSync(benchPath, 'utf8')) as BenchFile

const lines: string[] = []
lines.push('# Coteja reliability report')
lines.push('')
lines.push(`Generated from bench run started ${bench.startedAtIso}.`)
lines.push(
  `Model: **${bench.model.label}** (${bench.model.quantization}, ctx ${bench.model.ctxSize}) on ${bench.model.hardware}. All inference local.`,
)
lines.push('')
lines.push('| dossier | precision | recall | consistency | median latency | rule failures |')
lines.push('|---|---|---|---|---|---|')
for (const d of bench.dossiers) {
  lines.push(
    `| ${d.dossierId} | ${d.meanPrecision === null ? '—' : d.meanPrecision.toFixed(2)} | ${
      d.meanRecall === null ? '—' : d.meanRecall.toFixed(2)
    } | ${(d.consistency * 100).toFixed(0)}% | ${Math.round(d.medianTotalMs)} ms | ${(d.ruleFailureRate * 100).toFixed(1)}% |`,
  )
}
lines.push('')
process.stdout.write(lines.join('\n'))
