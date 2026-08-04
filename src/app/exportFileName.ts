/** True when `ch` is not safe in a single path segment on common filesystems. */
function isUnsafeFilenameChar(ch: string): boolean {
  const code = ch.charCodeAt(0)
  if (code < 32) return true
  return '<>:"/\\|?*'.includes(ch)
}

function exportStem(compoundName?: string): string {
  const trimmed = compoundName?.trim() ?? ''
  if (!trimmed) return 'label'
  let safe = ''
  for (const ch of trimmed.toLowerCase()) {
    safe += isUnsafeFilenameChar(ch) ? '-' : ch
  }
  safe = safe.replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe || 'label'
}

/** Download filename for a monochrome label PNG export. */
export function exportFileName(compoundName?: string): string {
  return `${exportStem(compoundName)}-export.png`
}
