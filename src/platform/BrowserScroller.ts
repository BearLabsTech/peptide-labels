import type { Scroller } from '../features/label/domain/ports'

/** Scrolls a named element into view on the next animation frame. */
export class BrowserScroller implements Scroller {
  scrollTo(id: string): void {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
}

/** Test double that records scroll targets and does not touch the DOM. */
export class NoopScroller implements Scroller {
  readonly calls: string[] = []

  scrollTo(id: string): void {
    this.calls.push(id)
  }
}
