import type { TestPrintStatus } from '../testIndicators'
import { pxToCqw } from '../Scaling'

interface TestStatusMarkProps {
  status: TestPrintStatus
  sizePx: number
  baseWidthPx: number
}

/** Monochrome box marks for thermal print — pass (check), fail (X), not run (empty). */
export function TestStatusMark({ status, sizePx, baseWidthPx }: TestStatusMarkProps) {
  const size = pxToCqw(sizePx, baseWidthPx)

  return (
    <svg
      className="label-test-mark"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: size, height: size, maxWidth: '100%' }}
    >
      <rect x="1" y="1" width="22" height="22" fill="#ffffff" stroke="#000000" strokeWidth="2" />
      {status === 'pass' && (
        <polyline
          points="5,12 10,17 19,7"
          fill="none"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      )}
      {status === 'fail' && (
        <>
          <line x1="7" y1="7" x2="17" y2="17" stroke="#000000" strokeWidth="2" strokeLinecap="square" />
          <line x1="17" y1="7" x2="7" y2="17" stroke="#000000" strokeWidth="2" strokeLinecap="square" />
        </>
      )}
    </svg>
  )
}
