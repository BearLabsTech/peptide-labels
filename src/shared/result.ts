/**
 * Shared success/failure convention for expected (recoverable) failures.
 * Reserve `throw` for programmer errors (precondition violations).
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export function ok(): Result<void, never>
export function ok<T>(value: T): Result<T, never>
export function ok<T>(value?: T): Result<T | void, never> {
  return { ok: true, value: value as T }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (!result.ok) return result
  return { ok: true, value: fn(result.value) }
}

export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (!result.ok) return result
  return fn(result.value)
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}
