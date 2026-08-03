import type { DesignFrame } from './designDocument'
import type { PrintTarget } from '../../print/types'

/** Absolute box placement as % of the full label sticker. */
export function designFrameStyle(
  frame: DesignFrame,
  printTarget: PrintTarget,
  rotationDeg: number,
  zIndex: number,
): Record<string, string> {
  const { labelWidthMm, labelHeightMm } = printTarget
  const style: Record<string, string> = {
    position: 'absolute',
    left: `${(frame.xMm / labelWidthMm) * 100}%`,
    top: `${(frame.yMm / labelHeightMm) * 100}%`,
    width: `${(frame.widthMm / labelWidthMm) * 100}%`,
    height: `${(frame.heightMm / labelHeightMm) * 100}%`,
    transformOrigin: 'center center',
    zIndex: String(zIndex),
    boxSizing: 'border-box',
  }
  if (rotationDeg) {
    style.transform = `rotate(${rotationDeg}deg)`
  }
  return style
}
