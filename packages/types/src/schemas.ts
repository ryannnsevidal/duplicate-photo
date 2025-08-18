import { z } from 'zod'

// Base schemas
export const MetaSchema = z.object({
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
  version: z.string().default('1.0.0'),
})

export const ErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
})

export const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
  }),
  meta: MetaSchema,
})

// User schemas
export const UserRoleSchema = z.enum(['user', 'admin'])

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: UserRoleSchema.default('user'),
  emailVerified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  password: z.string().min(8).max(128).optional(),
})

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const TokenSchema = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
})

// Pagination schemas
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
})

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})

// Response schemas
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: MetaSchema,
  })

export const PaginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    meta: MetaSchema,
    pagination: PaginationMetaSchema,
  })

// Type exports
export type Meta = z.infer<typeof MetaSchema>
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>
export type ApiError = z.infer<typeof ErrorSchema>
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type Login = z.infer<typeof LoginSchema>
export type Token = z.infer<typeof TokenSchema>
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

// Type guards
export const isApiError = (value: unknown): value is ApiError => {
  return ErrorSchema.safeParse(value).success
}

// Validation helpers
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}

export function validateSafe<T>(schema: z.ZodType<T>, data: unknown): z.SafeParseReturnType<unknown, T> {
  return schema.safeParse(data)
}