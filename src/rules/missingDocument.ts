import { baseFinding, type DiscrepancyRule, type RuleContext } from './engine.js'
import { DOC_TYPES } from '../types/documents.js'
import type { Finding } from '../types/findings.js'
import type { DocType } from '../types/documents.js'

export const missingDocumentRule: DiscrepancyRule = {
  id: 'missing_document',
  evaluate(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    for (const required of DOC_TYPES) {
      const declaredOfType = ctx.declared.filter((d) => d.docType === (required as DocType))
      if (declaredOfType.length === 0) {
        findings.push(
          baseFinding(
            this.id,
            'HUMAN_REVIEW',
            'MEDIUM',
            `required document type "${required}" was not provided in the dossier`,
            [],
          ),
        )
        continue
      }
      for (const declared of declaredOfType) {
        const reviewed = ctx.reviewed.find((r) => r.docId === declared.docId)
        if (reviewed !== undefined) {
          findings.push(
            baseFinding(
              this.id,
              'HUMAN_REVIEW',
              'MEDIUM',
              `document "${reviewed.docId}" (${reviewed.docType}) could not be checked automatically: ${reviewed.reason}`,
              [],
            ),
          )
        }
      }
    }
    return findings
  },
}
