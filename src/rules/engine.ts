import type { OcrBlock } from '../types/ocr.js'
import type { ProvenanceTag } from '../types/provenance.js'
import { nextFindingId, resolveSources } from '../types/findings.js'
import type { Finding } from '../types/findings.js'
import type { ExtractedDocument } from '../types/extraction.js'
import type { DocType, OcrDoc } from '../types/documents.js'

export interface ReviewedDoc {
  docId: string
  docType: DocType
  reason: string
}

export interface DeclaredDoc {
  docId: string
  docType: DocType
}

export interface RuleContext {
  extracted: readonly ExtractedDocument[]
  ocrDocs: readonly OcrDoc[]
  reviewed: readonly ReviewedDoc[]
  declared: readonly DeclaredDoc[]
}

export interface DiscrepancyRule {
  id: string
  evaluate(ctx: RuleContext): Finding[]
}

export function blocksForDoc(ctx: RuleContext, docId: string): OcrBlock[] {
  return ctx.ocrDocs.find((doc) => doc.docId === docId)?.blocks ?? []
}

export function evidence(
  ctx: RuleContext,
  docId: string,
  refs: readonly number[],
): SourceBundle {
  return resolveSources(docId, blocksForDoc(ctx, docId), refs)
}

export interface SourceBundle {
  sources: Finding['evidence']
  unresolvedRefs: number[]
}

export function baseFinding(
  ruleId: string,
  status: Finding['status'],
  severity: Finding['severity'],
  message: string,
  evidenceItems: Finding['evidence'],
  calculation?: string,
): Finding {
  const provenance: ProvenanceTag[] = ['ocr:OCR_LATIN', 'extraction:QWEN3_4B_INST_Q4_K_M', 'deterministic:typescript']
  return {
    id: nextFindingId(ruleId),
    ruleId,
    status,
    severity,
    message,
    calculation,
    evidence: evidenceItems,
    provenance,
  }
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function compactName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function namesMatch(a: string, b: string): boolean {
  const collapse = (value: string): string =>
    value.replace(/\./g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const na = collapse(a)
  const nb = collapse(b)
  if (na.length === 0 || nb.length === 0) return false
  if (na === nb || na.includes(nb) || nb.includes(na)) return true
  const ca = na.replace(/ /g, '')
  const cb = nb.replace(/ /g, '')
  if (ca.length >= 4 && cb.length >= 4 && ca === cb) return true

  const tokensA = new Set(na.split(' ').filter((t) => t.length >= 2))
  const tokensB = new Set(nb.split(' ').filter((t) => t.length >= 2))
  if (tokensA.size === 0 || tokensB.size === 0) return false
  const [smaller, larger] =
    tokensA.size <= tokensB.size ? [tokensA, tokensB] : [tokensB, tokensA]
  for (const token of smaller) {
    if (!larger.has(token)) return false
  }
  return true
}

export function numbersClose(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) <= epsilon
}

export function runRulesSequentially(
  rules: readonly DiscrepancyRule[],
  ctx: RuleContext,
): { findings: Finding[]; failedRuleIds: string[] } {
  const findings: Finding[] = []
  const failedRuleIds: string[] = []
  for (const rule of rules) {
    try {
      findings.push(...rule.evaluate(ctx))
    } catch (error) {
      failedRuleIds.push(rule.id)
      findings.push({
        id: nextFindingId(rule.id),
        ruleId: rule.id,
        status: 'HUMAN_REVIEW',
        severity: 'MEDIUM',
        message: `internal rule "${rule.id}" could not complete and requires human review`,
        evidence: [],
        provenance: ['deterministic:typescript'],
        reviewReason: String(error),
      })
    }
  }
  return { findings, failedRuleIds }
}
