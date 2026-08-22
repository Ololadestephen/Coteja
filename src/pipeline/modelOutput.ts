function isEmptyish(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    (typeof v === 'string' && v.trim().length === 0) ||
    (Array.isArray(v) && v.length === 0)
  )
}

function isFieldLike(value: Record<string, unknown>): boolean {
  return 'ref' in value && Array.isArray(value.ref) && ('value' in value || 'quote' in value)
}

export function normalizeModelObject(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.trim()
  }
  if (Array.isArray(input)) {
    return input.map(normalizeModelObject)
  }
  if (input === null || typeof input !== 'object') {
    return input
  }
  const obj = input as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(obj)) {
    const normalized = normalizeModelObject(raw)
    if (
      normalized !== null &&
      typeof normalized === 'object' &&
      !Array.isArray(normalized) &&
      isFieldLike(normalized as Record<string, unknown>)
    ) {
      const field = normalized as Record<string, unknown>
      if (isEmptyish(field.value) && isEmptyish(field.quote)) {
        continue
      }
      if (isEmptyish(field.value)) {
        continue
      }
    }
    if (normalized === undefined || normalized === null) {
      continue
    }
    if (typeof normalized === 'string' && normalized.length === 0 && key !== 'quote') {
      continue
    }
    out[key] = normalized
  }
  return out
}
