export const DOC_TYPES = [
  'letter_of_credit',
  'commercial_invoice',
  'packing_list',
  'bill_of_lading',
] as const

export type DocType = (typeof DOC_TYPES)[number]

export interface DossierDoc {
  docId: string
  type: DocType
  imagePaths: string[]
}

export interface DossierManifest {
  dossierId: string
  docs: DossierDoc[]
}

export interface OcrDoc {
  docId: string
  type: DocType
  blocks: import('./ocr.js').OcrBlock[]
}

export interface DossierOcr {
  dossierId: string
  docs: OcrDoc[]
}
