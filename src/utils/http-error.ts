export class HttpError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = this.constructor.name
  }
}

export function createHttpError(statusCode: number, message: string) {
  return new HttpError(statusCode, message)
}
