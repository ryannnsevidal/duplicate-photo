import { faker } from '@faker-js/faker'

// Set seed for consistent test data
faker.seed(123)

// User factory
export const createUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
})

// Product factory
export const createProduct = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price()),
  sku: faker.string.alphanumeric(8).toUpperCase(),
  inStock: faker.datatype.boolean(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
})

// Order factory
export const createOrder = (overrides = {}) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  status: faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  total: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
  items: [],
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
})

// API Response factory
export const createApiResponse = <T>(data: T, overrides = {}) => ({
  data,
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  },
  ...overrides,
})

// Error response factory
export const createErrorResponse = (overrides = {}) => ({
  error: {
    code: faker.string.alphanumeric(6).toUpperCase(),
    message: faker.lorem.sentence(),
    details: [],
  },
  meta: {
    timestamp: new Date().toISOString(),
    requestId: faker.string.uuid(),
  },
  ...overrides,
})

// Batch factories
export const createUsers = (count: number, overrides = {}) =>
  Array.from({ length: count }, () => createUser(overrides))

export const createProducts = (count: number, overrides = {}) =>
  Array.from({ length: count }, () => createProduct(overrides))

// Builder pattern for complex objects
export class UserBuilder {
  private user: ReturnType<typeof createUser>

  constructor() {
    this.user = createUser()
  }

  withEmail(email: string): this {
    this.user.email = email
    return this
  }

  withName(name: string): this {
    this.user.name = name
    return this
  }

  asAdmin(): this {
    this.user.role = 'admin'
    return this
  }

  verified(): this {
    this.user.emailVerified = true
    this.user.emailVerifiedAt = faker.date.past()
    return this
  }

  build() {
    return this.user
  }
}