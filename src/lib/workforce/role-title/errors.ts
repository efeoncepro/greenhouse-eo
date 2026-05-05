import 'server-only'

export type RoleTitleErrorCode =
  | 'invalid_input'
  | 'member_not_found'
  | 'reason_required'
  | 'forbidden'
  | 'no_change'

export class RoleTitleError extends Error {
  public readonly code: RoleTitleErrorCode
  public readonly statusCode: number

  constructor(message: string, code: RoleTitleErrorCode, statusCode = 400) {
    super(message)
    this.name = 'RoleTitleError'
    this.code = code
    this.statusCode = statusCode
  }
}
