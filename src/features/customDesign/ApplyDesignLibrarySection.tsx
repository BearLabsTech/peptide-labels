import type { RefObject } from 'react'
import type { DesignDocument } from './designDocument'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { stockLabelFor } from './useApplyDesignViewModel'

export interface ApplyDesignLibrarySectionProps {
  design: DesignDocument
  isBuiltinSample: boolean
  isInLibrary: boolean
  libraryLoading: boolean
  libraryDesigns: readonly DesignDocument[]
  isBusy: boolean
  statusMessage: string | null
  libraryError: string | null
  importIssueLines: readonly string[]
  fileInputRef: RefObject<HTMLInputElement | null>
  onOpenDesign: (design: DesignDocument) => void
  onSaveToLibrary: () => void
  onExportDesignFile: () => void
  onRemoveFromLibrary: () => void
  onImportFileChange: (fileInput: HTMLInputElement) => void
}

export function ApplyDesignLibrarySection({
  design,
  isBuiltinSample,
  isInLibrary,
  libraryLoading,
  libraryDesigns,
  isBusy,
  statusMessage,
  libraryError,
  importIssueLines,
  fileInputRef,
  onOpenDesign,
  onSaveToLibrary,
  onExportDesignFile,
  onRemoveFromLibrary,
  onImportFileChange,
}: ApplyDesignLibrarySectionProps) {
  return (
    <section className="apply-design__library" aria-label="Design library">
      <h2 className="apply-design__library-heading">Your designs</h2>
      <p className="apply-design__library-lede">
        Private on this device. Export a file to send in text, email, or Discord.
      </p>

      <ul className="apply-design__library-list">
        <li>
          <button
            type="button"
            className={
              isBuiltinSample
                ? 'apply-design__library-item apply-design__library-item--active'
                : 'apply-design__library-item'
            }
            onClick={() => onOpenDesign(SAMPLE_MITOCHONDRIA_DESIGN)}
          >
            <span className="apply-design__library-item-name">
              {SAMPLE_MITOCHONDRIA_DESIGN.name}
            </span>
            <span className="apply-design__library-item-meta">Built-in sample</span>
          </button>
        </li>
        {libraryLoading && (
          <li>
            <p className="apply-design__library-lede" role="status">
              Loading your designs…
            </p>
          </li>
        )}
        {libraryDesigns.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={
                entry.id === design.id
                  ? 'apply-design__library-item apply-design__library-item--active'
                  : 'apply-design__library-item'
              }
              onClick={() => onOpenDesign(entry)}
            >
              <span className="apply-design__library-item-name">{entry.name}</span>
              <span className="apply-design__library-item-meta">
                {stockLabelFor(entry)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="apply-design__library-actions">
        <button
          type="button"
          className="apply-design__secondary-btn"
          onClick={() => void onSaveToLibrary()}
          disabled={isBusy}
        >
          {isBuiltinSample || !isInLibrary ? 'Save to library' : 'Update in library'}
        </button>
        <button
          type="button"
          className="apply-design__secondary-btn"
          onClick={onExportDesignFile}
          disabled={isBusy}
          aria-busy={isBusy}
        >
          {isBusy ? 'Working…' : 'Export design file'}
        </button>
        <button
          type="button"
          className="apply-design__secondary-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
        >
          Import design file
        </button>
        {isInLibrary && !isBuiltinSample && (
          <button
            type="button"
            className="apply-design__secondary-btn apply-design__secondary-btn--danger"
            onClick={() => void onRemoveFromLibrary()}
            disabled={isBusy}
          >
            Remove from library
          </button>
        )}
      </div>

      <p id="apply-design-file-formats" className="visually-hidden">
        Accepted formats: .peptide-design or application/json design packages.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".peptide-design,application/json"
        className="apply-design__file-input"
        aria-label="Import design file"
        aria-describedby="apply-design-file-formats"
        onChange={(event) => onImportFileChange(event.target)}
      />

      {statusMessage && (
        <p className="apply-design__status" role="status">
          {statusMessage}
        </p>
      )}
      {libraryError && (
        <div className="label-export-error" role="alert">
          <p className="apply-design__import-error-summary">{libraryError}</p>
          {importIssueLines.length > 0 && (
            <ul className="apply-design__import-issues">
              {importIssueLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
