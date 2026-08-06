import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { LabelRenderModel } from './LabelComposer'
import { TestStatusMark } from './components/TestStatusMark'
import { labelContentStyle, labelStickerStyle } from '../../print/labelSurfaceStyle'
import { previewBaseWidthPx } from '../../print/dimensions'
import type { PrintTarget } from '../../print/types'
import { pxToCqw } from './Scaling'
import { computeQrRenderSizePx, testQrGapPx } from './qrRenderSize'
import { cssVars } from '../../shared/cssVars'
import { labelTypographyCssVars } from './labelTypographyCssVars'
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
    const isSparse = model.isSparse

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

    // Sparse composition folds testing into the title stack (no right column),
    // so QR sizing uses the remaining center share beside the logo (or full width).
    const qrWidthPercentForSize = isSparse
      ? Math.max(30, 100 - model.logoColumnWidthPercent)
      : model.qrColumnWidthPercent

    const qrRenderSizePx = computeQrRenderSizePx({
      qrColumnWidthPercent: qrWidthPercentForSize,
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

    const bodyBoxStyle = {
      fontSize: pxToCqw(model.bodyFontSizePx, baseWidthPx),
      paddingTop: pxToCqw(model.bodyBoxVerticalPadPx, baseWidthPx),
      paddingBottom: pxToCqw(model.bodyBoxVerticalPadPx, baseWidthPx),
    }

    const bodyArea = hasBody ? (
      <div className="label-body-area">
        {model.demotedTitle && (
          <div className="label-demoted-title" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 1.0, baseWidthPx) }}>
            {model.demotedTitle}
          </div>
        )}

        {model.reconstitutionLines.length > 0 && (
          <div className="label-preview-box" style={bodyBoxStyle}>
            <div className="label-preview-section-label">
              RECONSTITUTION
            </div>
            {model.reconstitutionLines.map((l, i) => (
              <div key={i} className="label-preview-section-text">{l}</div>
            ))}
          </div>
        )}

        {model.protocolLines.length > 0 && (
          <div className="label-preview-box" style={bodyBoxStyle}>
            <div className="label-preview-section-label">
              PROTOCOL
            </div>
            {model.protocolLines.map((l, i) => (
              <div key={i} className="label-preview-section-text">{l}</div>
            ))}
          </div>
        )}

        {model.sourceLines.length > 0 && (
          <div className="label-preview-box" style={bodyBoxStyle}>
            <div className="label-preview-section-label">
              SOURCE
            </div>
            {model.sourceLines.map((l, i) => (
              <div key={i} className="label-preview-section-text">{l}</div>
            ))}
          </div>
        )}
      </div>
    ) : null

    const testingBadges = model.testIndicators.length > 0 && model.testIndicatorLayout ? (
      <div
        className={`label-test-indicators${
          isSparse ? ' label-test-indicators--horizontal' : ''
        }${
          !isSparse && model.qrCodes.length > 0 ? ' label-test-indicators--with-qr' : ''
        }${!isSparse && model.qrCodes.length === 0 ? ' label-test-indicators--solo' : ''}`}
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
    ) : null

    const qrSlots = model.qrCodes.map((qr) => (
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
    ))

    const logoColumn = model.customImage ? (
      <div className="label-left-column" style={{ width: `${model.logoColumnWidthPercent}%` }}>
        <img src={model.customImage} className="label-mascot-image" alt="Logo" />
      </div>
    ) : null

    const testingColumn = hasTestingColumn ? (
      <div
        className={`label-right-column${
          model.qrCodes.length > 0 && model.testIndicators.length > 0
            ? ' label-right-column--with-qr-and-indicators'
            : ''
        }`}
        style={{ width: `${model.qrColumnWidthPercent}%` }}
      >
        {testingBadges}
        {qrSlots}
      </div>
    ) : null

    const sparseLogo = model.customImage ? (
      <div
        className="label-sparse-logo"
        style={{
          width: `${model.logoColumnWidthPercent}%`,
          height: pxToCqw(model.sparseLogoHeightPx, baseWidthPx),
        }}
      >
        <img src={model.customImage} className="label-mascot-image" alt="Logo" />
      </div>
    ) : null

    const sparseStackContent = (
      <>
        {titleArea}
        {model.demotedTitle ? (
          <div
            className="label-demoted-title"
            style={{ fontSize: pxToCqw(model.bodyFontSizePx, baseWidthPx) }}
          >
            {model.demotedTitle.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        ) : null}
        {testingBadges}
        {qrSlots}
      </>
    )

    let sparseBody: ReactNode = null
    if (isSparse && (hasLogo || hasTestingColumn)) {
      if (hasLogo) {
        sparseBody = (
          <div className="label-sparse-row">
            {sparseLogo}
            <div className="label-sparse-stack">{sparseStackContent}</div>
          </div>
        )
      } else {
        sparseBody = (
          <div className="label-sparse-stack label-sparse-stack--full">
            {sparseStackContent}
          </div>
        )
      }
    }

    const denseTitleBand = (includeLogoGutter: boolean) => (
      <div className="label-title-band label-title-band-row">
        {includeLogoGutter && hasLogo && titleBandGutter(model.logoColumnWidthPercent)}
        <div className="label-title-band-center">
          <div className="label-title-breakout" style={identityTitleBandStyle}>
            {titleArea}
          </div>
        </div>
        {hasTestingColumn && titleBandGutter(model.qrColumnWidthPercent)}
      </div>
    )

    /** Dense + logo: title sits in the primary stack and centers over that whole area
     *  (center + testing), not over the logo column. Column % widths still drive layout. */
    const densePrimaryTitleBand = (
      <div className="label-title-band label-title-band--primary-center">
        {titleArea}
      </div>
    )

    const denseMainRow = (includeLogo: boolean) =>
      (hasBody || (includeLogo && logoColumn) || testingColumn) && (
        <div className="label-main-row">
          {includeLogo ? logoColumn : null}
          <div className="label-center-column">{bodyArea}</div>
          {testingColumn}
        </div>
      )

    return (
      <div
        ref={ref}
        className="label-sticker"
        style={{ ...labelStickerStyle(printTarget), ...style }}
      >
        <div
          className={`label-preview-container label-preview-container--identity-header${
            isSparse ? ' label-preview-container--sparse' : ''
          }`}
          style={{ ...labelContentStyle(printTarget), ...labelTypographyCssVars() }}
        >
          {isSparse ? (
            sparseBody ?? <div className="label-sparse-stack label-sparse-stack--full">{titleArea}</div>
          ) : hasLogo ? (
            <div className="label-dense-logo-row">
              {logoColumn}
              <div className="label-dense-primary">
                {densePrimaryTitleBand}
                {denseMainRow(false)}
              </div>
            </div>
          ) : (
            <>
              {denseTitleBand(true)}
              {denseMainRow(true)}
            </>
          )}
        </div>
      </div>
    )
  }
)
