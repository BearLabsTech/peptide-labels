import { describe, expect, it } from 'vitest'
import { andThen, map, unwrapOr, type Result } from './result'

describe('Result helpers', () => {
  const ok: Result<number, string> = { ok: true, value: 2 }
  const err: Result<number, string> = { ok: false, error: 'nope' }

  it('should map over an ok result', () => {
    expect(map(ok, (n) => n * 3)).toEqual({ ok: true, value: 6 })
  })

  it('should pass an error through map unchanged', () => {
    expect(map(err, (n: number) => n * 3)).toEqual({ ok: false, error: 'nope' })
  })

  it('should chain a second fallible step with andThen when ok', () => {
    expect(andThen(ok, (n) => ({ ok: true, value: String(n) }))).toEqual({
      ok: true,
      value: '2',
    })
  })

  it('should pass an error through andThen unchanged', () => {
    expect(andThen(err, (n) => ({ ok: true, value: String(n) }))).toEqual({
      ok: false,
      error: 'nope',
    })
  })

  it('should unwrap an ok value', () => {
    expect(unwrapOr(ok, 0)).toBe(2)
  })

  it('should return the fallback when unwrapping an error', () => {
    expect(unwrapOr(err, 0)).toBe(0)
  })
})
