import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { exportLabelPng } from '../label/labelExport'
import type { PrintSetupSelection } from '../label/print/types'
import { areRequiredSlotsFilled, type DesignSlotValues } from './bindDesignSlots'
import type { DesignDocument } from './designDocument'
import {
  createIndexedDbDesignLibrary,
  prepareDesignForLibrary,
  touchDesignUpdatedAt,
  type DesignLibraryStore,
} from './designLibrary'
import { DesignPreview } from './DesignPreview'
import {
  downloadDesignPackage,
  readDesignPackageFile,
} from './designPackage'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { resolveDesignPrintTarget } from './resolveDesignPrintTarget'
import './ApplyDesignView.css'

export interface ApplyDesignViewProps {
  printSelection: PrintSetupSelection
  library?: DesignLibraryStore
}

const BUILTIN_SAMPLE_ID = SAMPLE_MITOCHONDRIA_DESIGN.id

function emptySlotValues(keys: string[]): DesignSlotValues {
  return Object.fromEntries(keys.map((key) => [key, '']))
}

function stockLabelFor(design: DesignDocument): string {
  return design.stock.kind === 'catalog'
    ? design.stock.stockId
    : `${design.stock.widthMm} × ${design.stock.heightMm} mm`
}

export function ApplyDesignView({ printSelection, library: libraryProp }: ApplyDesignViewProps) {
  const library = useMemo(
    () => libraryProp ?? createIndexedDbDesignLibrary(),
    [libraryProp],
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const [design, setDesign] = useState<DesignDocument>(SAMPLE_MITOCHONDRIA_DESIGN)
  const [slotValues, setSlotValues] = useState<DesignSlotValues>(() =>
    emptySlotValues(SAMPLE_MITOCHONDRIA_DESIGN.slots.map((slot) => slot.key)),
  )
  const [libraryDesigns, setLibraryDesigns] = useState<DesignDocument[]>([])
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const printTarget = useMemo(
    () =>
      resolveDesignPrintTarget(design, {
        printerId: printSelection.printerId,
        vialCapacityMl: printSelection.vialCapacityMl ?? printSelection.vialMl,
      }),
    [design, printSelection.printerId, printSelection.vialCapacityMl, printSelection.vialMl],
  )

  const canExportPng = areRequiredSlotsFilled(design, slotValues)
  const isBuiltinSample = design.id === BUILTIN_SAMPLE_ID
  const isInLibrary = libraryDesigns.some((entry) => entry.id === design.id)

  const refreshLibrary = useCallback(async () => {
    try {
      const listed = await library.list()
      setLibraryDesigns(listed)
      setLibraryError(null)
    } catch {
      setLibraryError('Couldn’t load your local design library.')
    }
  }, [library])

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  function openDesign(next: DesignDocument) {
    setDesign(next)
    setSlotValues(emptySlotValues(next.slots.map((slot) => slot.key)))
    setExportError(null)
    setStatusMessage(null)
  }

  function updateSlot(key: string, value: string) {
    setSlotValues((prev) => ({ ...prev, [key]: value }))
  }

  async function downloadLabelPng() {
    if (!labelRef.current || !canExportPng || isExporting) return
    setExportError(null)
    flushSync(() => {
      setIsExporting(true)
    })
    try {
      const compoundName = slotValues.compoundName?.trim() || design.name
      await exportLabelPng(labelRef.current, printTarget, compoundName)
    } catch {
      setExportError('Couldn’t download the label. Try again.')
    } finally {
      setIsExporting(false)
    }
  }

  async function saveToLibrary() {
    setIsBusy(true)
    setStatusMessage(null)
    try {
      const toSave = isBuiltinSample || !isInLibrary
        ? prepareDesignForLibrary(design)
        : touchDesignUpdatedAt(design)
      await library.put(toSave)
      await refreshLibrary()
      openDesign(toSave)
      setStatusMessage('Saved to your local library (private on this device).')
    } catch {
      setLibraryError('Couldn’t save the design to your local library.')
    } finally {
      setIsBusy(false)
    }
  }

  function exportDesignFile() {
    try {
      downloadDesignPackage(design)
      setStatusMessage('Design file downloaded — send it in a message to share.')
    } catch {
      setLibraryError('Couldn’t export the design file.')
    }
  }

  async function removeFromLibrary() {
    if (isBuiltinSample || !isInLibrary) return
    setIsBusy(true)
    try {
      await library.remove(design.id)
      await refreshLibrary()
      openDesign(SAMPLE_MITOCHONDRIA_DESIGN)
      setStatusMessage('Removed from your local library.')
    } catch {
      setLibraryError('Couldn’t remove the design.')
    } finally {
      setIsBusy(false)
    }
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return
    setIsBusy(true)
    setLibraryError(null)
    try {
      const parsed = await readDesignPackageFile(file)
      if (!parsed.ok) {
        setLibraryError('That file isn’t a valid peptide design package.')
        return
      }
      const imported = prepareDesignForLibrary(parsed.document)
      await library.put(imported)
      await refreshLibrary()
      openDesign(imported)
      setStatusMessage('Imported and saved to your local library.')
    } catch {
      setLibraryError('Couldn’t import that design file.')
    } finally {
      setIsBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="apply-design">
      <div className="apply-design__stage stage-panel">
        <div className="apply-design__banner">
          <div>
            <div className="apply-design__banner-title">{design.name}</div>
            <div className="apply-design__banner-meta">
              {isBuiltinSample ? 'Built-in sample' : isInLibrary ? 'Local library' : 'Imported'}
              {' · '}
              fill fields and export
              {' · '}
              {stockLabelFor(design)}
            </div>
          </div>
        </div>
        <div className="label-stage-mat">
          <DesignPreview
            ref={labelRef}
            design={design}
            slotValues={slotValues}
            printTarget={printTarget}
            showPlaceholders={!isExporting}
          />
        </div>
        <button
          type="button"
          className="btn-primary apply-design__download"
          onClick={downloadLabelPng}
          disabled={!canExportPng || isExporting}
        >
          {isExporting ? 'Preparing PNG…' : 'Download Label PNG'}
        </button>
        {!canExportPng && (
          <p className="apply-design__hint">
            Fill the required fields in the panel to enable download.
          </p>
        )}
        {exportError && (
          <p className="label-export-error" role="alert">
            {exportError}
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
            {design.slots.map((slot) => (
              <label key={slot.key} className="apply-design__field">
                <span className="apply-design__field-label">
                  {slot.label}
                  {slot.required ? ' *' : ''}
                </span>
                <input
                  type={slot.type === 'number' ? 'text' : slot.type === 'url' ? 'url' : 'text'}
                  inputMode={slot.type === 'number' ? 'decimal' : undefined}
                  className="apply-design__input"
                  value={slotValues[slot.key] ?? ''}
                  onChange={(event) => updateSlot(slot.key, event.target.value)}
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
                    isBuiltinSample
                      ? 'apply-design__library-item apply-design__library-item--active'
                      : 'apply-design__library-item'
                  }
                  onClick={() => openDesign(SAMPLE_MITOCHONDRIA_DESIGN)}
                >
                  <span className="apply-design__library-item-name">
                    {SAMPLE_MITOCHONDRIA_DESIGN.name}
                  </span>
                  <span className="apply-design__library-item-meta">Built-in sample</span>
                </button>
              </li>
              {libraryDesigns.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={
                      entry.id === design.id
                        ? 'apply-design__library-item apply-design__library-item--active'
                        : 'apply-design__library-item'
                    }
                    onClick={() => openDesign(entry)}
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
                onClick={() => void saveToLibrary()}
                disabled={isBusy}
              >
                {isBuiltinSample || !isInLibrary ? 'Save to library' : 'Update in library'}
              </button>
              <button
                type="button"
                className="apply-design__secondary-btn"
                onClick={exportDesignFile}
                disabled={isBusy}
              >
                Export design file
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
                  onClick={() => void removeFromLibrary()}
                  disabled={isBusy}
                >
                  Remove from library
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".peptide-design,application/json"
              className="apply-design__file-input"
              onChange={(event) => void onImportFile(event.target.files?.[0])}
            />

            {statusMessage && (
              <p className="apply-design__status" role="status">
                {statusMessage}
              </p>
            )}
            {libraryError && (
              <p className="label-export-error" role="alert">
                {libraryError}
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
