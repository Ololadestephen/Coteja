import { QWEN3_1_7B_INST_Q4, OCR_LATIN } from '@qvac/sdk'

export const LLM_MODEL_SRC = QWEN3_1_7B_INST_Q4
export const OCR_MODEL_SRC = OCR_LATIN

export const LLM_CTX_SIZE = 8192
export const REASONING_BUDGET = 0
export const COMPLETION_TEMP = 0
export const COMPLETION_SEED = 20260822

export const LOW_OCR_CONFIDENCE_THRESHOLD = 0.5
export const ARITHMETIC_EPSILON = 0.01
export const QUANTITY_TOLERANCE = 0
export const MAX_CHUNK_CHARS = 3600

export const MODEL_LABEL = 'QWEN3_1_7B_INST_Q4'
export const MODEL_QUANTIZATION = 'Q4'
export const OCR_LABEL = 'OCR_LATIN (CRAFT + recognizer)'
