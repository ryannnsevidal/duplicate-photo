import { beforeAll, afterAll, beforeEach } from 'vitest'
import { GenericContainer, StartedTestContainer } from 'testcontainers'
import type { StartedPostgreSqlContainer } from 'testcontainers'
import type { StartedRedisContainer } from 'testcontainers'

let pgContainer: StartedTestContainer | undefined
let redisContainer: StartedTestContainer | undefined

export async function setupTestDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) {
    pgContainer = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test_db',
      })
      .withExposedPorts(5432)
      .withStartupTimeout(120000)
      .start()

    const host = pgContainer.getHost()
    const port = pgContainer.getMappedPort(5432)
    process.env.DATABASE_URL = `postgres://test:test@${host}:${port}/test_db`
  }
}

export async function setupTestRedis(): Promise<void> {
  if (process.env.NODE_ENV === 'test' && !process.env.REDIS_URL) {
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withStartupTimeout(60000)
      .start()

    const host = redisContainer.getHost()
    const port = redisContainer.getMappedPort(6379)
    process.env.REDIS_URL = `redis://${host}:${port}`
  }
}

export async function teardownTestContainers(): Promise<void> {
  await Promise.all([
    pgContainer?.stop(),
    redisContainer?.stop(),
  ])
}

// Global test setup
export function setupIntegrationTests(): void {
  beforeAll(async () => {
    await Promise.all([
      setupTestDatabase(),
      setupTestRedis(),
    ])
  }, 30000)

  afterAll(async () => {
    await teardownTestContainers()
  }, 30000)

  beforeEach(() => {
    // Reset any global state between tests
  })
}

// Test utilities
export async function clearDatabase(): Promise<void> {
  // Implementation depends on your ORM
  // Example for Prisma:
  // const prisma = new PrismaClient()
  // await prisma.$transaction([
  //   prisma.model1.deleteMany(),
  //   prisma.model2.deleteMany(),
  // ])
}

export function createMockRequest(overrides = {}): any {
  return {
    headers: {},
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

export function createMockResponse(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  res.set = vi.fn().mockReturnValue(res)
  return res
}