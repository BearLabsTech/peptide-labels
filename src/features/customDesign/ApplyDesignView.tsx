import { useRef } from 'react'
import type { PrintSetupSelection } from '../../print/types'
import { DesignPreview } from './DesignPreview'
import type { DesignDocument } from './designDocument'
import type { DesignLibraryStore } from './designLibrary'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { stockLabelFor, useApplyDesignViewModel } from './useApplyDesignViewModel'
import './ApplyDesignView.css'

export interface ApplyDesignViewProps {
  printSelection: PrintSetupSelection
  library?: DesignLibraryStore
}

export function ApplyDesignView({ printSelection, library }: ApplyDesignViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const vm = useApplyDesignViewModel({ printSelection, library })

  function onImportFileChange(fileInput: HTMLInputElement) {
    void vm.importFile(fileInput.files?.[0]).finally(() => {
      fileInput.value = ''
    })
  }

  return (
    <div className="apply-design">
      <div className="apply-design__stage stage-panel">
        <div className="apply-design__banner">
          <div>
            <div className="apply-design__banner-title">{vm.design.name}</div>
            <div className="apply-design__banner-meta">
              {vm.isBuiltinSample ? 'Built-in sample' : vm.isInLibrary ? 'Local library' : 'Imported'}
              {' · '}
              fill fields and export
              {' · '}
              {stockLabelFor(vm.design)}
            </div>
          </div>
        </div>
        <div className="label-stage-mat">
          <DesignPreview
            ref={labelRef}
            design={vm.design}
            slotValues={vm.slotValues}
            printTarget={vm.printTarget}
            showPlaceholders={!vm.isExporting}
          />
        </div>
        <button
          type="button"
          className="btn-primary apply-design__download"
          onClick={() => void vm.downloadLabelPng(labelRef.current)}
          disabled={!vm.canExportPng || vm.isExporting}
          aria-busy={vm.isExporting}
        >
          {vm.isExporting ? 'Preparing PNG…' : 'Download Label PNG'}
        </button>
        {!vm.canExportPng && (
          <p className="apply-design__hint">
            Fill the required fields in the panel to enable download.
          </p>
        )}
        {vm.exportError && (
          <p className="label-export-error" role="alert">
            {vm.exportError}
          </p>
        )}
      </div>

      <aside className="apply-design__sidebar sidebar-panel">
        <div className="sidebar-scroll-area">
          <h1 className="apply-design__heading">Fill this design</h1>
          <p className="apply-design__lede">
            Enter values for the fields this design accepts. The preview updates live; download a
            print-ready PNG when required fields are filled.
          </p>
          <p className="apply-design__note">
            Layout editing (move, resize, rotate boxes) is not available yet — this step is fill
            and export only. Save designs on this device or share a design file in a message.
          </p>

          <div className="apply-design__fields">
            {vm.design.slots.map((slot) => (
              <label key={slot.key} className="apply-design__field">
                <span className="apply-design__field-label">
                  {slot.label}
                  {slot.required ? ' *' : ''}
                </span>
                <input
                  type={slot.type === 'number' ? 'text' : slot.type === 'url' ? 'url' : 'text'}
                  inputMode={slot.type === 'number' ? 'decimal' : undefined}
                  className="apply-design__input"
                  value={vm.slotValues[slot.key] ?? ''}
                  onChange={(event) => vm.updateSlot(slot.key, event.target.value)}
                  placeholder={slot.label}
                  required={slot.required}
                  autoComplete="off"
                />
              </label>
            ))}
          </div>

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
                    vm.isBuiltinSample
                      ? 'apply-design__library-item apply-design__library-item--active'
                      : 'apply-design__library-item'
                  }
                  onClick={() => vm.openDesign(SAMPLE_MITOCHONDRIA_DESIGN)}
                >
                  <span className="apply-design__library-item-name">
                    {SAMPLE_MITOCHONDRIA_DESIGN.name}
                  </span>
                  <span className="apply-design__library-item-meta">Built-in sample</span>
                </button>
              </li>
              {vm.libraryLoading && (
                <li>
                  <p className="apply-design__library-lede" role="status">
                    Loading your designs…
                  </p>
                </li>
              )}
              {vm.libraryDesigns.map((entry: DesignDocument) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={
                      entry.id === vm.design.id
                        ? 'apply-design__library-item apply-design__library-item--active'
                        : 'apply-design__library-item'
                    }
                    onClick={() => vm.openDesign(entry)}
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
                onClick={() => void vm.saveToLibrary()}
                disabled={vm.isBusy}
              >
                {vm.isBuiltinSample || !vm.isInLibrary ? 'Save to library' : 'Update in library'}
              </button>
              <button
                type="button"
                className="apply-design__secondary-btn"
                onClick={vm.exportDesignFile}
                disabled={vm.isBusy}
                aria-busy={vm.isBusy}
              >
                {vm.isBusy ? 'Working…' : 'Export design file'}
              </button>
              <button
                type="button"
                className="apply-design__secondary-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={vm.isBusy}
              >
                Import design file
              </button>
              {vm.isInLibrary && !vm.isBuiltinSample && (
                <button
                  type="button"
                  className="apply-design__secondary-btn apply-design__secondary-btn--danger"
                  onClick={() => void vm.removeFromLibrary()}
                  disabled={vm.isBusy}
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

            {vm.statusMessage && (
              <p className="apply-design__status" role="status">
                {vm.statusMessage}
              </p>
            )}
            {vm.libraryError && (
              <p className="label-export-error" role="alert">
                {vm.libraryError}
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
