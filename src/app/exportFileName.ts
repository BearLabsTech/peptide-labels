/** Download filename for a monochrome label PNG export. */
export function exportFileName(compoundName?: string): string {
  return `${(compoundName ?? 'label').toLowerCase()}-export.png`
}
