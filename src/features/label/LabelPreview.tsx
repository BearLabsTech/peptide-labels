import { forwardRef, type CSSProperties } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { LabelRenderModel } from './LabelComposer'
import { TestStatusMark } from './components/TestStatusMark'
import { labelContentStyle, labelStickerStyle } from './print/labelSurfaceStyle'
import { previewBaseWidthPx } from './print/dimensions'
import type { PrintTarget } from './print/types'
import { pxToCqw } from './Scaling'
import { computeQrRenderSizePx, testQrGapPx } from './qrRenderSize'
import { cssVars } from '../../shared/cssVars'
import './LabelPreview.css'

interface LabelPreviewProps {
  model: LabelRenderModel
  printTarget: PrintTarget
  style?: CSSProperties
}

export const LabelPreview = forwardRef<HTMLDivElement, LabelPreviewProps>(
  ({ model, printTarget, style }, ref) => {
    const hasBody = !!model.demotedTitle || model.reconstitutionLines.length > 0 || model.protocolLines.length > 0 || model.sourceLines.length > 0
    const hasLogo = !!model.customImage
    const hasTestingColumn = model.qrCodes.length > 0 || model.testIndicators.length > 0

    const baseWidthPx = previewBaseWidthPx(printTarget)
    const { axisFraction, breakoutWidthPct, breakoutMarginLeftPct } = model.identityHeaderTitleBreakout
    const identityTitleBandStyle: CSSProperties = cssVars({
      '--title-axis-pct': `${axisFraction * 100}%`,
      '--title-breakout-width-pct': `${breakoutWidthPct}`,
      '--title-breakout-margin-left-pct': `${breakoutMarginLeftPct}`,
    })

    const titleBandGutter = (widthPercent: number) => (
      <div
        className="label-title-band-gutter"
        style={{ width: `${widthPercent}%` }}
        aria-hidden="true"
      />
    )
    const qrRenderSizePx = computeQrRenderSizePx({
      qrColumnWidthPercent: model.qrColumnWidthPercent,
      qrCodeCount: model.qrCodes.length,
      testIndicatorCount: model.testIndicators.length,
      testIndicatorLayout: model.testIndicatorLayout,
      titleLines: model.titleLines,
      titleFontSizePx: model.titleFontSizePx,
    }, printTarget, baseWidthPx)
    const testQrGapStyle =
      model.qrCodes.length > 0 && model.testIndicators.length > 0
        ? { paddingTop: pxToCqw(testQrGapPx(baseWidthPx), baseWidthPx) }
        : undefined

    const titleArea = (
      <div className="label-title-area">
        {model.isDangerMode ? (
          <div className="danger-title-wrapper" style={{ fontSize: pxToCqw(model.titleFontSizePx, baseWidthPx) }}>
            <div className="danger-icon">☠️</div>
            <div className="danger-text">
              {model.title.split('\n').map((line, i) => <div key={i}>{line}</div>)}
            </div>
            <div className="danger-icon">☠️</div>
          </div>
        ) : (
          <div className="label-preview-title" style={{ fontSize: pxToCqw(model.titleFontSizePx, baseWidthPx) }}>
            {model.titleLines.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
      </div>
    )

    const bodyArea = hasBody ? (
      <div className="label-body-area">
        {model.demotedTitle && (
          <div className="label-demoted-title" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 1.0, baseWidthPx) }}>
            {model.demotedTitle}
          </div>
        )}

        {model.reconstitutionLines.length > 0 && (
          <div className="label-preview-box" style={{ fontSize: pxToCqw(model.bodyFontSizePx, baseWidthPx) }}>
            <div className="label-preview-section-label" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.55, baseWidthPx) }}>
              RECONSTITUTION
            </div>
            {model.reconstitutionLines.map((l, i) => (
              <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.82, baseWidthPx) }}>{l}</div>
            ))}
          </div>
        )}

        {model.protocolLines.length > 0 && (
          <div className="label-preview-box" style={{ fontSize: pxToCqw(model.bodyFontSizePx, baseWidthPx) }}>
            <div className="label-preview-section-label" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.55, baseWidthPx) }}>
              PROTOCOL
            </div>
            {model.protocolLines.map((l, i) => (
              <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.82, baseWidthPx) }}>{l}</div>
            ))}
          </div>
        )}

        {model.sourceLines.length > 0 && (
          <div className="label-preview-box" style={{ fontSize: pxToCqw(model.bodyFontSizePx, baseWidthPx) }}>
            <div className="label-preview-section-label" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.55, baseWidthPx) }}>
              SOURCE
            </div>
            {model.sourceLines.map((l, i) => (
              <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.82, baseWidthPx) }}>{l}</div>
            ))}
          </div>
        )}
      </div>
    ) : null

    const logoColumn = model.customImage ? (
      <div className="label-left-column" style={{ width: `${model.logoColumnWidthPercent}%` }}>
        <img src={model.customImage} className="label-mascot-image" alt="Logo" />
      </div>
    ) : null

    const testingColumn = (model.qrCodes.length > 0 || model.testIndicators.length > 0) ? (
      <div
        className={`label-right-column${
          model.qrCodes.length > 0 && model.testIndicators.length > 0
            ? ' label-right-column--with-qr-and-indicators'
            : ''
        }`}
        style={{ width: `${model.qrColumnWidthPercent}%` }}
      >
        {model.testIndicators.length > 0 && model.testIndicatorLayout && (
          <div
            className={`label-test-indicators${
              model.qrCodes.length > 0 ? ' label-test-indicators--with-qr' : ' label-test-indicators--solo'
            }`}
            style={{ gap: pxToCqw(model.testIndicatorLayout.rowGapPx, baseWidthPx) }}
          >
            {model.testIndicators.map((entry) => (
              <div
                key={entry.type}
                className="label-test-row"
                style={{ gap: pxToCqw(model.testIndicatorLayout!.labelMarkGapPx, baseWidthPx) }}
              >
                <span
                  className="label-test-name"
                  style={{ fontSize: pxToCqw(model.testIndicatorLayout!.labelFontSizePx, baseWidthPx) }}
                >
                  {entry.label}
                </span>
                <TestStatusMark
                  status={entry.status}
                  sizePx={model.testIndicatorLayout!.markSizePx}
                  baseWidthPx={baseWidthPx}
                />
              </div>
            ))}
          </div>
        )}
        {model.qrCodes.map((qr) => (
          <div
            key={qr.type}
            className={`label-qr-slot${model.testIndicators.length > 0 ? ' label-qr-slot--below-indicators' : ''}`}
            style={testQrGapStyle}
          >
            <div className="label-qr-slot-graphic">
                <QRCodeSVG
                  value={qr.url}
                  size={qrRenderSizePx}
                  className="label-qr-svg"
                  style={{
                    width: pxToCqw(qrRenderSizePx, baseWidthPx),
                    height: pxToCqw(qrRenderSizePx, baseWidthPx),
                  }}
                />
            </div>
            <div className="qr-text">{qr.type}</div>
          </div>
        ))}
      </div>
    ) : null

    return (
      <div
        ref={ref}
        className="label-sticker"
        style={{ ...labelStickerStyle(printTarget), ...style }}
      >
        <div
          className="label-preview-container label-preview-container--identity-header"
          style={labelContentStyle(printTarget)}
        >
          <div className="label-title-band label-title-band-row">
            {hasLogo && titleBandGutter(model.logoColumnWidthPercent)}
            <div className="label-title-band-center">
              <div className="label-title-breakout" style={identityTitleBandStyle}>
                {titleArea}
              </div>
            </div>
            {hasTestingColumn && titleBandGutter(model.qrColumnWidthPercent)}
          </div>
          {(hasBody || logoColumn || testingColumn) && (
            <div className="label-main-row">
              {logoColumn}
              <div className="label-center-column">
                {bodyArea}
              </div>
              {testingColumn}
            </div>
          )}
        </div>
      </div>
    )
  }
)
