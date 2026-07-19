import type { DesignDocument } from './designDocument'
import { validateDesignDocument, type DesignDocumentValidationIssue } from './validateDesignDocument'

export type ParseDesignDocumentResult =
  | { ok: true; document: DesignDocument }
  | { ok: false; issues: DesignDocumentValidationIssue[]; parseError?: string }

/** Serialize a validated design document to JSON text. */
export function serializeDesignDocument(document: DesignDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`
}

/**
 * Parse JSON text and validate as a DesignDocument.
 * Round-trips with serializeDesignDocument for valid documents.
 */
export function parseDesignDocument(json: string): ParseDesignDocumentResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid JSON'
    return {
      ok: false,
      issues: [{ path: '', message: 'JSON parse failed' }],
      parseError: message,
    }
  }
  const result = validateDesignDocument(parsed)
  if (!result.ok) {
    return { ok: false, issues: result.issues }
  }
  return { ok: true, document: result.document }
}
