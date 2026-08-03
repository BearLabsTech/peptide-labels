import { forwardRef, type CSSProperties } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { labelStickerStyle } from '../../print/labelSurfaceStyle'
import type { PrintTarget } from '../../print/types'
import {
  designAssetDataUrl,
  resolveBoundText,
  type DesignSlotValues,
} from './bindDesignSlots'
import type { DesignDocument, DesignElement, DesignSlot } from './designDocument'
import { designFrameStyle } from './designFrameStyle'
import { fontSizePtToCqw, resolveDesignFontFamily } from './designFonts'
import './DesignPreview.css'

export interface DesignPreviewProps {
  design: DesignDocument
  slotValues: DesignSlotValues
  printTarget: PrintTarget
  style?: CSSProperties
  /** When true, empty slots show their field label so the layout is readable before fill. */
  showPlaceholders?: boolean
}

export const DesignPreview = forwardRef<HTMLDivElement, DesignPreviewProps>(
  function DesignPreview(
    { design, slotValues, printTarget, style, showPlaceholders = false },
    ref,
  ) {
    const assetsById = new Map(design.assets.map((asset) => [asset.id, asset]))
    const slotsByKey = new Map(design.slots.map((slot) => [slot.key, slot]))
    const elements = [...design.elements].sort((a, b) => a.zIndex - b.zIndex)

    return (
      <div
        ref={ref}
        className="label-sticker design-preview"
        style={{ ...labelStickerStyle(printTarget), ...style }}
        data-design-id={design.id}
      >
        <div className="design-preview__surface">
          {elements.map((element) => (
            <DesignElementView
              key={element.id}
              element={element}
              slotValues={slotValues}
              slotsByKey={slotsByKey}
              printTarget={printTarget}
              assetsById={assetsById}
              showPlaceholders={showPlaceholders}
            />
          ))}
        </div>
      </div>
    )
  },
)

function DesignElementView({
  element,
  slotValues,
  slotsByKey,
  printTarget,
  assetsById,
  showPlaceholders,
}: {
  element: DesignElement
  slotValues: DesignSlotValues
  slotsByKey: Map<string, DesignSlot>
  printTarget: PrintTarget
  assetsById: Map<string, DesignDocument['assets'][number]>
  showPlaceholders: boolean
}) {
  const frameStyle = designFrameStyle(
    element.frame,
    printTarget,
    element.rotationDeg,
    element.zIndex,
  )

  if (element.type === 'text') {
    const bound = resolveBoundText(element.content, slotValues)
    const isPlaceholder =
      showPlaceholders && !bound && element.content.kind === 'slot'
    const placeholderLabel =
      element.content.kind === 'slot'
        ? (slotsByKey.get(element.content.slotKey)?.label ?? element.content.slotKey)
        : ''
    const text = bound || (isPlaceholder ? placeholderLabel : '')
    const inverted = element.ink === 'reverse' && !isPlaceholder
    const fillSolid = !isPlaceholder && (element.fill === 'solid' || element.ink === 'reverse')
    const fontSizePt = isPlaceholder
      ? Math.min(element.fontSizePt, 5.5)
      : element.fontSizePt
    const boxStyle: CSSProperties = {
      ...frameStyle,
      display: 'flex',
      alignItems:
        element.alignV === 'top' ? 'flex-start' : element.alignV === 'bottom' ? 'flex-end' : 'center',
      justifyContent:
        element.alignH === 'left' ? 'flex-start' : element.alignH === 'right' ? 'flex-end' : 'center',
      textAlign: element.alignH,
      fontFamily: resolveDesignFontFamily(element.fontId),
      fontSize: fontSizePtToCqw(fontSizePt, printTarget.labelWidthMm),
      fontWeight: element.bold ? 700 : 400,
      whiteSpace: isPlaceholder || element.wrap ? 'pre-wrap' : 'nowrap',
      overflow: 'hidden',
      lineHeight: 1.15,
      letterSpacing: '0.02em',
      WebkitFontSmoothing: 'none',
      textRendering: 'geometricPrecision',
      color: inverted ? '#ffffff' : '#000000',
      backgroundColor: fillSolid ? '#000000' : 'transparent',
      padding: fillSolid ? '0.5cqw' : isPlaceholder ? '0.4cqw' : 0,
      opacity: isPlaceholder ? 0.45 : 1,
      outline: isPlaceholder ? '0.35cqw dashed #000000' : undefined,
      outlineOffset: isPlaceholder ? '-0.35cqw' : undefined,
    }
    return (
      <div className="design-preview__text" style={boxStyle}>
        {text}
      </div>
    )
  }

  if (element.type === 'image') {
    const asset = assetsById.get(element.assetId)
    if (!asset) return null
    return (
      <div className="design-preview__image" style={frameStyle}>
        <img
          src={designAssetDataUrl(asset.mimeType, asset.dataBase64)}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: element.objectFit,
            display: 'block',
            imageRendering: 'pixelated',
          }}
        />
      </div>
    )
  }

  if (element.type === 'qr') {
    const value = resolveBoundText(element.content, slotValues)
    return (
      <div className="design-preview__qr" style={frameStyle}>
        {value ? (
          <QRCodeSVG
            value={value}
            size={128}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        ) : showPlaceholders ? (
          <div className="design-preview__qr-placeholder">QR</div>
        ) : null}
      </div>
    )
  }

  if (element.shape === 'line') {
    return (
      <div
        className="design-preview__shape design-preview__shape--line"
        style={{
          ...frameStyle,
          borderTop: element.stroke ? '0.4cqw solid #000000' : undefined,
          backgroundColor: element.fill ? '#000000' : 'transparent',
        }}
      />
    )
  }

  return (
    <div
      className="design-preview__shape"
      style={{
        ...frameStyle,
        border: element.stroke ? '0.4cqw solid #000000' : undefined,
        backgroundColor: element.fill ? '#000000' : 'transparent',
      }}
    />
  )
}
