import { runRulesSequentially, type DeclaredDoc, type ReviewedDoc, type RuleContext } from '../rules/engine.js'
import { quantityMismatchRule } from '../rules/quantityMismatch.js'
import { totalArithmeticRule } from '../rules/totalArithmetic.js'
import { currencyMismatchRule } from '../rules/currencyMismatch.js'
import { shipmentDateRule } from '../rules/shipmentDate.js'
import { partyMismatchRule } from '../rules/partyMismatch.js'
import { missingDocumentRule } from '../rules/missingDocument.js'
import type { Finding } from '../types/findings.js'
import type { DossierManifest, OcrDoc } from '../types/documents.js'
import type { ExtractionOutcome } from '../types/extraction.js'

export const RULE_REGISTRY = [
  quantityMismatchRule,
  totalArithmeticRule,
  currencyMismatchRule,
  shipmentDateRule,
  partyMismatchRule,
  missingDocumentRule,
] as const

export interface ControlsStageResult {
  findings: Finding[]
  failedRuleIds: string[]
}

export function runControlsStage(
  manifest: DossierManifest,
  outcomes: ReadonlyMap<string, ExtractionOutcome>,
  ocrDocs: OcrDoc[],
): ControlsStageResult {
  const extracted = []
  const reviewed: ReviewedDoc[] = []
  for (const doc of manifest.docs) {
    const outcome = outcomes.get(doc.docId)
    if (outcome === undefined) {
      reviewed.push({ docId: doc.docId, docType: doc.type, reason: 'no extraction outcome recorded' })
      continue
    }
    if (outcome.status === 'extracted' && outcome.document !== undefined) {
      extracted.push(outcome.document)
    } else {
      reviewed.push({
        docId: outcome.docId,
        docType: doc.type,
        reason: outcome.reason ?? 'unknown review reason',
      })
    }
  }
  const declared: DeclaredDoc[] = manifest.docs.map((d) => ({ docId: d.docId, docType: d.type }))
  const ctx: RuleContext = { extracted, ocrDocs, reviewed, declared }
  return runRulesSequentially(RULE_REGISTRY, ctx)
}
