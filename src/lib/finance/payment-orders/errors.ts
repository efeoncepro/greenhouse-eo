export class PaymentOrderValidationError extends Error {
  statusCode: number
  code: string

  constructor(message: string, code = 'validation_error', statusCode = 400) {
    super(message)
    this.name = 'PaymentOrderValidationError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class PaymentOrderConflictError extends Error {
  statusCode: number
  code: string

  constructor(message: string, code = 'conflict', statusCode = 409) {
    super(message)
    this.name = 'PaymentOrderConflictError'
    this.code = code
    this.statusCode = statusCode
  }
}
