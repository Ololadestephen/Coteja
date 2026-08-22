import { cotejaRun } from '../pipeline/run.js'
import { loadDossier } from '../dossier/loadDossier.js'
import { scorePacket, type DossierRunMetrics } from './metrics.js'

export interface DossierBenchSummary {
  dossierId: string
  runs: DossierRunMetrics[]
  verdictCounts: Record<string, number>
  consistency: number
  meanPrecision: number | null
  meanRecall: number | null
  medianTotalMs: number
  ruleFailureRate: number
}

export interface BenchResult {
  startedAtIso: string
  model: { label: string; quantization: string; ctxSize: number; hardware: string }
  runsPerDossier: number
  dossiers: DossierBenchSummary[]
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function mean(values: readonly (number | null)[]): number | null {
  const defined = values.filter((v): v is number => v !== null)
  if (defined.length === 0) return null
  return defined.reduce((a, b) => a + b, 0) / defined.length
}

export async function runBench(dossierDirs: readonly string[], runs: number): Promise<BenchResult> {
  const dossiers: DossierBenchSummary[] = []
  for (const dir of dossierDirs) {
    const loaded = loadDossier(dir)
    const runMetrics: DossierRunMetrics[] = []
    for (let i = 1; i <= runs; i++) {
      process.stdout.write(`▸ ${loaded.manifest.dossierId} run ${i}/${runs}\n`)
      const packet = await cotejaRun(dir)
      const metrics = scorePacket(packet, loaded.groundTruth, i, packet.stats.ruleFailures)
      runMetrics.push(metrics)
    }
    const verdictCounts: Record<string, number> = {}
    for (const r of runMetrics) {
      verdictCounts[r.verdict] = (verdictCounts[r.verdict] ?? 0) + 1
    }
    const topCount = Math.max(...Object.values(verdictCounts))
    dossiers.push({
      dossierId: loaded.manifest.dossierId,
      runs: runMetrics,
      verdictCounts,
      consistency: topCount / runMetrics.length,
      meanPrecision: mean(runMetrics.map((r) => r.precision)),
      meanRecall: mean(runMetrics.map((r) => r.recall)),
      medianTotalMs: median(runMetrics.map((r) => r.totalMs)),
      ruleFailureRate:
        runMetrics.reduce((acc, r) => acc + r.ruleFailures, 0) / (runMetrics.length * 6),
    })
  }
  return {
    startedAtIso: new Date().toISOString(),
    model: await modelInfo(),
    runsPerDossier: runs,
    dossiers,
  }
}

async function modelInfo() {
  const { MODEL_LABEL, MODEL_QUANTIZATION, LLM_CTX_SIZE } = await import('../config.js')
  const { hardwareLabel } = await import('../pipeline/run.js')
  return {
    label: MODEL_LABEL,
    quantization: MODEL_QUANTIZATION,
    ctxSize: LLM_CTX_SIZE,
    hardware: hardwareLabel(),
  }
}
