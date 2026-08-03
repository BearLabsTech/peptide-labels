import type { ExportSpec } from '../../../print/types'

/**
 * Port interfaces for every I/O boundary this feature (and `customDesign`,
 * which shares the download/storage ports) crosses: canvas rasterization,
 * PNG encoding, file download, key/value storage, IndexedDB, and DOM scroll.
 * Adapters implementing these live in `src/platform` (action 4.3); app-layer
 * use cases (action 4.2) depend on these interfaces only, never on the
 * concrete browser API. See `docs/CODE-QUALITY.md` section A ("Dependency
 * inversion") and `.cursor/rules/domain-label-architecture.mdc`.
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
    set(key: string, value: string): void
    remove(key: string): void
}

/**
 * A CRUD store for a document identified by `id`. Generic over the document
 * type so this port stays in `label`'s domain without importing
 * `customDesign`'s `DesignDocument` — the only thing every implementation
 * needs to know about the document is that it carries its own `id`, the
 * same shape `designLibrary.ts`'s IndexedDB store already has.
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
