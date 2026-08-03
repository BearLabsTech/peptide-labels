import type { Result } from '../../../shared/result'

export const IMAGE_UPLOAD_ERROR_MESSAGE = 'Couldn’t read that image file.'

/**
 * Reads a local image file as a data URL. Surfaces FileReader failures instead of
 * leaving a filename with no image.
 */
export function readImageFileAsDataUrl(
  file: File,
  createReader: () => FileReader = () => new FileReader(),
): Promise<Result<string, string>> {
  return new Promise((resolve) => {
    const reader = createReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve({ ok: true, value: reader.result })
        return
      }
      console.error('Image FileReader finished without a data URL', reader.error)
      resolve({ ok: false, error: IMAGE_UPLOAD_ERROR_MESSAGE })
    }
    reader.onerror = () => {
      console.error('Image FileReader failed', reader.error)
      resolve({ ok: false, error: IMAGE_UPLOAD_ERROR_MESSAGE })
    }
    reader.readAsDataURL(file)
  })
}
