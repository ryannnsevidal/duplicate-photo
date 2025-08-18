import { vi } from 'vitest'

// Time travel utilities
export function mockDate(date: Date | string): () => void {
  const actualDate = new Date(date)
  vi.useFakeTimers()
  vi.setSystemTime(actualDate)
  return () => vi.useRealTimers()
}

// Wait utilities
export async function waitFor(
  fn: () => boolean | Promise<boolean>,
  options = { timeout: 5000, interval: 100 }
): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < options.timeout) {
    if (await fn()) return
    await new Promise(resolve => setTimeout(resolve, options.interval))
  }
  
  throw new Error(`Timeout waiting for condition after ${options.timeout}ms`)
}

// Mock fetch
export function mockFetch(responses: Record<string, any>): void {
  global.fetch = vi.fn(async (url: string) => {
    const response = responses[url] || { status: 404, body: 'Not found' }
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
    } as Response
  })
}

// Environment helpers
export function withEnv(vars: Record<string, string>, fn: () => void | Promise<void>): () => Promise<void> {
  return async () => {
    const original = { ...process.env }
    Object.assign(process.env, vars)
    try {
      await fn()
    } finally {
      process.env = original
    }
  }
}

// Retry helper for flaky tests
export async function retry<T>(
  fn: () => Promise<T>,
  options = { attempts: 3, delay: 100 }
): Promise<T> {
  let lastError: Error | undefined
  
  for (let i = 0; i < options.attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < options.attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, options.delay * (i + 1)))
      }
    }
  }
  
  throw lastError
}

// Performance testing helper
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  threshold?: number
): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  
  console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
  
  if (threshold && duration > threshold) {
    throw new Error(`Performance threshold exceeded: ${duration}ms > ${threshold}ms`)
  }
  
  return result
}