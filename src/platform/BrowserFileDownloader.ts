import type { FileDownloader } from '../features/label/domain/ports'

/** Triggers a browser download from raw bytes via an object URL. */
export class BrowserFileDownloader implements FileDownloader {
  download(bytes: Uint8Array, filename: string): void {
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    const blob = new Blob([copy], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}
