import type { Finding } from './findings.js'
import type { InjectionFlag } from '../guard/patterns.js'

export type Verdict = 'PASS' | 'DISCREPANCY' | 'NEEDS_HUMAN_REVIEW'

export interface StageTimingsMs {
  ocr: number
  extraction: number
  controls: number
  evidenceLock: number
  total: number
}

export interface RunMetadata {
  modelLabel: string
  quantization: string
  ctxSize: number
  hardware: string
  tokensPerSecond: number[]
}

export interface PacketStats {
  docsChecked: number
  repairsUsed: number
  humanReviews: number
  ruleFailures: number
}

export interface EvidencePacket {
  dossierId: string
  verdict: Verdict
  generatedAtIso: string
  findings: Finding[]
  injectionFlags: InjectionFlag[]
  timings: StageTimingsMs
  run: RunMetadata
  stats: PacketStats
}
