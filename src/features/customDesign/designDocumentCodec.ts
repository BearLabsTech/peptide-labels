import type { DesignDocument } from './designDocument'
import { validateDesignDocument, type DesignDocumentValidationIssue } from './validateDesignDocument'
import type { Result } from '../../shared/result'

/** Discriminated parse failure — invalid document vs unreadable JSON. */
export type DesignParseFailure =
  | { kind: 'invalid'; issues: DesignDocumentValidationIssue[] }
  | {
      kind: 'unreadable'
      parseError: string
      issues: DesignDocumentValidationIssue[]
    }

export type ParseDesignDocumentResult = Result<DesignDocument, DesignParseFailure>

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
    console.error('Design document JSON parse failed', error)
    return {
      ok: false,
      error: {
        kind: 'unreadable',
        parseError: message,
        issues: [{ path: '', message: 'JSON parse failed' }],
      },
    }
  }
  const result = validateDesignDocument(parsed)
  if (!result.ok) {
    return { ok: false, error: { kind: 'invalid', issues: result.error } }
  }
  return { ok: true, value: result.value }
}
