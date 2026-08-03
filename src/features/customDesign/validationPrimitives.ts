/**
 * Generic runtime-shape checks and issue collection shared by every design
 * document validator (document-level fields, stock/slot/asset, and the
 * per-element-kind validators in `elementValidators/`).
 */

export type DesignDocumentValidationIssue = {
  path: string
  message: string
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function push(
  issues: DesignDocumentValidationIssue[],
  path: string,
  message: string,
): void {
  issues.push({ path, message })
}
