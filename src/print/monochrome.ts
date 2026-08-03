const MONOCHROME_WHITE_THRESHOLD = 200

/** Applies a black-or-white thermal threshold in place. */
export function applyMonochromeThreshold(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const alpha = data[i + 3]
    const brightness = r * 0.299 + g * 0.587 + b * 0.114

    if (alpha < 128 || brightness > MONOCHROME_WHITE_THRESHOLD) {
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = 255
    } else {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 255
    }
  }
}
