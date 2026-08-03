import type { FileDownloader } from '../label/domain/ports'
import { BrowserFileDownloader } from '../../platform/BrowserFileDownloader'
import type { DesignDocument } from './designDocument'
import { validateDesignDocument, type DesignDocumentValidationIssue } from './validateDesignDocument'

const defaultDownloader: FileDownloader = new BrowserFileDownloader()

export const PEPTIDE_DESIGN_FORMAT = 'peptide-design' as const
export const PEPTIDE_DESIGN_FORMAT_VERSION = 1 as const
export const PEPTIDE_DESIGN_EXTENSION = '.peptide-design'

export type PeptideDesignPackage = {
  format: typeof PEPTIDE_DESIGN_FORMAT
  formatVersion: typeof PEPTIDE_DESIGN_FORMAT_VERSION
  document: DesignDocument
}

export type ParseDesignPackageResult =
  | { ok: true; document: DesignDocument }
  | { ok: false; issues: DesignDocumentValidationIssue[]; parseError?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Wrap a design document for portable .peptide-design files. */
export function createDesignPackage(document: DesignDocument): PeptideDesignPackage {
  return {
    format: PEPTIDE_DESIGN_FORMAT,
    formatVersion: PEPTIDE_DESIGN_FORMAT_VERSION,
    document,
  }
}

export function serializeDesignPackage(document: DesignDocument): string {
  return `${JSON.stringify(createDesignPackage(document), null, 2)}\n`
}

/**
 * Parse a .peptide-design JSON payload (wrapped package or bare DesignDocument).
 * Embedded assets travel inside the document — no external URLs.
 */
export function parseDesignPackage(json: string): ParseDesignPackageResult {
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

  if (!isRecord(parsed)) {
    return { ok: false, issues: [{ path: '', message: 'package must be an object' }] }
  }

  if (parsed.format === PEPTIDE_DESIGN_FORMAT) {
    if (parsed.formatVersion !== PEPTIDE_DESIGN_FORMAT_VERSION) {
      return {
        ok: false,
        issues: [
          {
            path: 'formatVersion',
            message: `must be ${PEPTIDE_DESIGN_FORMAT_VERSION}`,
          },
        ],
      }
    }
    const docResult = validateDesignDocument(parsed.document)
    if (!docResult.ok) return { ok: false, issues: docResult.issues }
    return { ok: true, document: docResult.document }
  }

  // Bare document (schemaVersion present) for flexibility.
  if ('schemaVersion' in parsed) {
    const docResult = validateDesignDocument(parsed)
    if (!docResult.ok) return { ok: false, issues: docResult.issues }
    return { ok: true, document: docResult.document }
  }

  return {
    ok: false,
    issues: [
      {
        path: 'format',
        message: `expected "${PEPTIDE_DESIGN_FORMAT}" package or a design document`,
      },
    ],
  }
}

/** Safe download filename from a design name. */
export function designPackageFilename(document: DesignDocument): string {
  const base = document.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'design'}${PEPTIDE_DESIGN_EXTENSION}`
}

export function downloadDesignPackage(
  designDoc: DesignDocument,
  downloader: FileDownloader = defaultDownloader,
): void {
  const json = serializeDesignPackage(designDoc)
  const bytes = new TextEncoder().encode(json)
  downloader.download(bytes, designPackageFilename(designDoc))
}

export async function readDesignPackageFile(file: File): Promise<ParseDesignPackageResult> {
  const text = await file.text()
  return parseDesignPackage(text)
}
