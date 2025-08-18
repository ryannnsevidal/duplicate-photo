/**
 * Base error class for domain errors
 */
export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when an entity is not found
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'

  constructor(entity: string, id?: string) {
    super(id ? `${entity} with id ${id} not found` : `${entity} not found`)
  }
}

/**
 * Thrown when a business rule is violated
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
  readonly details: Array<{ field?: string; message: string }>

  constructor(message: string, details: Array<{ field?: string; message: string }> = []) {
    super(message)
    this.details = details
  }
}

/**
 * Thrown when an operation is not allowed
 */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN'

  constructor(message = 'Operation not allowed') {
    super(message)
  }
}

/**
 * Thrown when authentication fails
 */
export class AuthenticationError extends DomainError {
  readonly code = 'AUTHENTICATION_ERROR'

  constructor(message = 'Authentication failed') {
    super(message)
  }
}

/**
 * Thrown when there's a conflict (e.g., duplicate resource)
 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT'

  constructor(message: string) {
    super(message)
  }
}

/**
 * Type guard to check if an error is a DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}