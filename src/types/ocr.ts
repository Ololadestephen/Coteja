export type BBox = [number, number, number, number]

export interface OcrBlock {
  text: string
  page: number
  bbox?: BBox
  confidence?: number
}
