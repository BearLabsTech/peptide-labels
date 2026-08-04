import { describe, expect, it } from 'vitest'
import { andThen, err, map, ok, unwrapOr, type Result } from './result'

describe('Result constructors', () => {
  it('should build an ok result with a value', () => {
    expect(ok(2)).toEqual({ ok: true, value: 2 })
  })

  it('should build a void ok result without a value argument', () => {
    expect(ok()).toEqual({ ok: true, value: undefined })
  })

  it('should build an error result', () => {
    expect(err('nope')).toEqual({ ok: false, error: 'nope' })
  })
})

describe('Result helpers', () => {
  const okResult: Result<number, string> = { ok: true, value: 2 }
  const errResult: Result<number, string> = { ok: false, error: 'nope' }

  it('should map over an ok result', () => {
    expect(map(okResult, (n) => n * 3)).toEqual({ ok: true, value: 6 })
  })

  it('should pass an error through map unchanged', () => {
    expect(map(errResult, (n: number) => n * 3)).toEqual({ ok: false, error: 'nope' })
  })

  it('should chain a second fallible step with andThen when ok', () => {
    expect(andThen(okResult, (n) => ({ ok: true, value: String(n) }))).toEqual({
      ok: true,
      value: '2',
    })
  })

  it('should pass an error through andThen unchanged', () => {
    expect(andThen(errResult, (n) => ({ ok: true, value: String(n) }))).toEqual({
      ok: false,
      error: 'nope',
    })
  })

  it('should unwrap an ok value', () => {
    expect(unwrapOr(okResult, 0)).toBe(2)
  })

  it('should return the fallback when unwrapping an error', () => {
    expect(unwrapOr(errResult, 0)).toBe(0)
  })
})
