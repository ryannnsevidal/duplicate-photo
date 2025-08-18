import type { paths } from './openapi'

type FetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean>
  token?: string
}

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: HeadersInit

  constructor(baseUrl: string = '', defaultHeaders: HeadersInit = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = defaultHeaders
  }

  private async request<T>(
    path: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { params, token, headers, ...fetchOptions } = options

    // Build URL with query params
    const url = new URL(path, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    // Merge headers
    const finalHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...headers,
    }

    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers: finalHeaders,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { code: 'UNKNOWN', message: response.statusText },
      }))
      throw new ApiError(response.status, error)
    }

    return response.json()
  }

  // Health check
  async getHealth() {
    type Response = paths['/health']['get']['responses']['200']['content']['application/json']
    return this.request<Response>('/health')
  }

  // Auth endpoints
  async register(data: paths['/auth/register']['post']['requestBody']['content']['application/json']) {
    type Response = paths['/auth/register']['post']['responses']['201']['content']['application/json']
    return this.request<Response>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async login(data: paths['/auth/login']['post']['requestBody']['content']['application/json']) {
    type Response = paths['/auth/login']['post']['responses']['200']['content']['application/json']
    return this.request<Response>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // User endpoints
  async listUsers(params: { page?: number; pageSize?: number; q?: string } = {}, token: string) {
    type Response = paths['/users']['get']['responses']['200']['content']['application/json']
    return this.request<Response>('/users', { params, token })
  }

  async getUserById(id: string, token: string) {
    type Response = paths['/users/{id}']['get']['responses']['200']['content']['application/json']
    return this.request<Response>(`/users/${id}`, { token })
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: any
  ) {
    super(body?.error?.message || `API Error: ${status}`)
    this.name = 'ApiError'
  }
}

// Factory function for creating typed API clients
export function createApiClient(baseUrl: string): ApiClient {
  return new ApiClient(baseUrl)
}

// Type-safe fetch wrapper
export async function typedFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init)
  
  if (!response.ok) {
    throw new ApiError(response.status, await response.json().catch(() => null))
  }
  
  return response.json()
}