/** Fresh opaque id for persisted documents (browser crypto when available). */
export function randomId(now: () => Date = () => new Date()): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `design-${now().toISOString()}`
}
