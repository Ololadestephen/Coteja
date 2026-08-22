import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { DOC_TYPES } from '../types/documents.js'
import type { DossierManifest } from '../types/documents.js'

export const groundTruthSchema = z.object({
  expectedVerdict: z.enum(['PASS', 'DISCREPANCY', 'NEEDS_HUMAN_REVIEW']),
  expectedDiscrepancyRules: z.array(z.string()).default([]),
})

export type GroundTruth = z.infer<typeof groundTruthSchema>

const manifestSchema = z.object({
  dossierId: z.string().min(1),
  docs: z
    .array(
      z.object({
        docId: z.string().min(1),
        type: z.enum(DOC_TYPES),
        imagePaths: z.array(z.string()).min(1),
      }),
    )
    .min(1),
})

export interface LoadedDossier {
  dir: string
  manifest: DossierManifest
  groundTruth: GroundTruth | null
}

export function loadDossier(dossierDir: string): LoadedDossier {
  const manifestPath = join(dossierDir, 'manifest.json')
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')))
  let groundTruth: GroundTruth | null = null
  try {
    groundTruth = groundTruthSchema.parse(
      JSON.parse(readFileSync(join(dossierDir, 'ground-truth.json'), 'utf8')),
    )
  } catch {
    groundTruth = null
  }
  return { dir: dossierDir, manifest, groundTruth }
}
