import { useRef } from 'react'
import type { PrintSetupSelection } from '../../print/types'
import { ApplyDesignLibrarySection } from './ApplyDesignLibrarySection'
import { DesignPreview } from './DesignPreview'
import type { DesignLibraryStore } from './designLibrary'
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

          <ApplyDesignLibrarySection
            design={vm.design}
            isBuiltinSample={vm.isBuiltinSample}
            isInLibrary={vm.isInLibrary}
            libraryLoading={vm.libraryLoading}
            libraryDesigns={vm.libraryDesigns}
            isBusy={vm.isBusy}
            statusMessage={vm.statusMessage}
            libraryError={vm.libraryError}
            importIssueLines={vm.importIssueLines}
            fileInputRef={fileInputRef}
            onOpenDesign={vm.openDesign}
            onSaveToLibrary={vm.saveToLibrary}
            onExportDesignFile={vm.exportDesignFile}
            onRemoveFromLibrary={vm.removeFromLibrary}
            onImportFileChange={onImportFileChange}
          />
        </div>
      </aside>
    </div>
  )
}
