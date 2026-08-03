import type { ExportSpec } from '../print/types'
import type { Result } from './result'

/**
 * Port interfaces for every I/O boundary the app crosses: canvas rasterization,
 * PNG encoding, file download, key/value storage, IndexedDB, and DOM scroll.
 * Shared across features (`label`, `customDesign`, `landing`) and `print` so
 * no feature imports another feature for these contracts.
 * Adapters live in `src/platform`; app-layer use cases depend on these
 * interfaces only. See `docs/CODE-QUALITY.md` section A and ADR ports/adapters.
 *
 * Interfaces only — no implementations here.
 */

/** Raw PNG file bytes, the same representation `print/pngPhys.ts` already reads and writes. */
export type PngBytes = Uint8Array

/**
 * Renders a DOM element to a PNG. `element` is typed with the ambient DOM
 * lib interface (no import statement, no runtime call) because that is the
 * real shape every implementation receives — html-to-image's `toPng` itself
 * requires an `HTMLElement` — not a domain module calling a browser API.
 */
export interface Rasterizer {
  capture(element: HTMLElement, spec: ExportSpec): Promise<PngBytes>
}

/**
 * Converts a captured PNG to the thermal printer's monochrome output at the
 * given DPI. Asynchronous because every real implementation decodes the
 * bytes through a canvas (`Image` load, `canvas.toBlob`), both of which are
 * callback/promise-based browser APIs — there is no synchronous path.
 */
export interface ImageProcessor {
  toMonochrome(bytes: PngBytes, dpi: number): Promise<PngBytes>
}

/**
 * Triggers a browser file download. Not PNG-specific: `designPackage.ts`
 * downloads a `.peptide-design` JSON payload through the same port, so the
 * byte type here is the generic `Uint8Array`, not {@link PngBytes}.
 */
export interface FileDownloader {
  download(bytes: Uint8Array, filename: string): void
}

/** A synchronous string key/value store — the shape `localStorage` already has. */
export interface KeyValueStore {
  get(key: string): string | null
  /** Returns failure when the underlying store rejects the write (quota, privacy mode, etc.). */
  set(key: string, value: string): Result<void, string>
  remove(key: string): void
}

/**
 * A CRUD store for a document identified by `id`. Generic over the document
 * type so this port does not depend on any feature's document shape — the
 * only thing every implementation needs is that the document carries its own `id`.
 */
export interface DesignLibrary<TDocument extends { readonly id: string }> {
  list(): Promise<TDocument[]>
  get(id: string): Promise<TDocument | null>
  put(document: TDocument): Promise<void>
  remove(id: string): Promise<void>
}

/** Scrolls a named element into view. */
export interface Scroller {
  scrollTo(id: string): void
}
