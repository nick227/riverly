// Services throw HttpError; the global error handler maps it to `{ error, code?, details? }`.
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, 'bad_request', details)
export const unauthorized = (msg = 'Not signed in') => new HttpError(401, msg, 'unauthorized')
export const forbidden = (msg = 'You do not have permission to do that') => new HttpError(403, msg, 'forbidden')
export const notFound = (what = 'Record') => new HttpError(404, `${what} not found`, 'not_found')
export const conflict = (msg: string, code = 'conflict') => new HttpError(409, msg, code)
export const unprocessable = (msg: string, details?: unknown) => new HttpError(422, msg, 'unprocessable', details)
export const tooMany = (msg = 'Too many requests, try again shortly') => new HttpError(429, msg, 'rate_limited')
