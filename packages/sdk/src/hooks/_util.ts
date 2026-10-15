import { ApiError } from '../client'

type Result<T> = { data?: T; error?: unknown; response: Response }

/** Unwraps an openapi-fetch result, throwing ApiError with the server's message on failure. */
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await promise
  if (error !== undefined || !response.ok) {
    const e = error as { error?: string; code?: string; details?: unknown } | undefined
    const err = new ApiError(response.status, e?.error ?? `Request failed (${response.status})`, e?.code)
    ;(err as ApiError & { details?: unknown }).details = e?.details
    throw err
  }
  return data as T
}

/** Client-generated key so retries of the same user action are applied once. */
export function idempotencyKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
