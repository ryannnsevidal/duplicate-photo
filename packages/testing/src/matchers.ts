import { expect } from 'vitest'

// Custom matchers for better test assertions
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    }
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within range ${min} - ${max}`
          : `expected ${received} to be within range ${min} - ${max}`,
    }
  },

  toHaveStatus(response: any, expectedStatus: number) {
    const pass = response.status === expectedStatus
    return {
      pass,
      message: () =>
        pass
          ? `expected response not to have status ${expectedStatus}`
          : `expected response to have status ${expectedStatus}, but got ${response.status}`,
    }
  },

  toMatchApiSchema(received: any) {
    const hasData = 'data' in received
    const hasMeta = 'meta' in received
    const hasTimestamp = hasMeta && 'timestamp' in received.meta
    const pass = hasData && hasMeta && hasTimestamp
    
    return {
      pass,
      message: () =>
        pass
          ? `expected response not to match API schema`
          : `expected response to match API schema with 'data' and 'meta' properties`,
    }
  },
})

// Extend vitest types
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidUUID(): T
    toBeWithinRange(min: number, max: number): T
    toHaveStatus(status: number): T
    toMatchApiSchema(): T
  }
  interface AsymmetricMatchersContaining {
    toBeValidUUID(): any
    toBeWithinRange(min: number, max: number): any
    toHaveStatus(status: number): any
    toMatchApiSchema(): any
  }
}