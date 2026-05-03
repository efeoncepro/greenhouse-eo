export class PaymentProfileValidationError extends Error {
  statusCode: number
  code: string

  constructor(message: string, code = 'validation_error', statusCode = 400) {
    super(message)
    this.name = 'PaymentProfileValidationError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class PaymentProfileConflictError extends Error {
  statusCode: number
  code: string

  constructor(message: string, code = 'conflict', statusCode = 409) {
    super(message)
    this.name = 'PaymentProfileConflictError'
    this.code = code
    this.statusCode = statusCode
  }
}
