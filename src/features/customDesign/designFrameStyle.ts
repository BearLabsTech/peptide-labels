import type { CSSProperties } from 'react'
import type { DesignFrame } from './designDocument'
import type { PrintTarget } from '../label/print/types'

/** Absolute box placement as % of the full label sticker. */
export function designFrameStyle(
  frame: DesignFrame,
  printTarget: PrintTarget,
  rotationDeg: number,
  zIndex: number,
): CSSProperties {
  const { labelWidthMm, labelHeightMm } = printTarget
  return {
    position: 'absolute',
    left: `${(frame.xMm / labelWidthMm) * 100}%`,
    top: `${(frame.yMm / labelHeightMm) * 100}%`,
    width: `${(frame.widthMm / labelWidthMm) * 100}%`,
    height: `${(frame.heightMm / labelHeightMm) * 100}%`,
    transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined,
    transformOrigin: 'center center',
    zIndex,
    boxSizing: 'border-box',
  }
}
