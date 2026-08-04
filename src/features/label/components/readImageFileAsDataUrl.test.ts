import { describe, expect, it, vi } from 'vitest'
import {
  IMAGE_UPLOAD_ERROR_MESSAGE,
  readImageFileAsDataUrl,
} from './readImageFileAsDataUrl'

function fakeFile(): File {
  return new File(['fake'], 'logo.png', { type: 'image/png' })
}

describe('readImageFileAsDataUrl', () => {
  it('should return the data URL when FileReader succeeds', async () => {
    const createReader = () => {
      const reader = {
        result: 'data:image/png;base64,abc' as string | ArrayBuffer | null,
        error: null as DOMException | null,
        onloadend: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
        onerror: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
        readAsDataURL() {
          queueMicrotask(() => {
            this.onloadend?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>)
          })
        },
      }
      return reader as unknown as FileReader
    }

    await expect(readImageFileAsDataUrl(fakeFile(), createReader)).resolves.toEqual({
      ok: true,
      value: 'data:image/png;base64,abc',
    })
  })

  it('should surface a discoverable error when FileReader fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const createReader = () => {
      const reader = {
        result: null as string | ArrayBuffer | null,
        error: new DOMException('read failed'),
        onloadend: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
        onerror: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
        readAsDataURL() {
          queueMicrotask(() => {
            this.onerror?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>)
          })
        },
      }
      return reader as unknown as FileReader
    }

    await expect(readImageFileAsDataUrl(fakeFile(), createReader)).resolves.toEqual({
      ok: false,
      error: IMAGE_UPLOAD_ERROR_MESSAGE,
    })
    errorSpy.mockRestore()
  })
})
