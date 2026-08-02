import type { CSSProperties } from 'react'

/** Build a CSSProperties object from typed custom-property names (`--foo`). */
export function cssVars(record: Record<`--${string}`, string>): CSSProperties {
  return record as CSSProperties
}
