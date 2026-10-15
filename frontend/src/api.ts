import type { Post, User } from './types'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const TOKEN_KEY = 'knowsphere_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

type Options = { method?: string; body?: unknown; auth?: boolean }

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401 && options.auth !== false) onUnauthorized?.()
    throw new ApiError(res.status, data?.error ?? 'Something went wrong')
  }
  return data as T
}

type AuthResponse = { token: string; user: User }

function query(params: Record<string, string | number | null | undefined>) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: { email, password }, auth: false }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => request<{ user: User }>('/auth/me').then((r) => r.user),

  listPosts: (p: { tag?: string | null; cursor?: string | null; limit: number }) =>
    request<{ data: Post[]; nextCursor: string | null }>(`/posts${query(p)}`),
  searchPosts: (p: { q: string; tag?: string | null; offset: number; limit: number }) =>
    request<{ data: Post[] }>(`/posts/search${query(p)}`),
  createPost: (body: { url: string; title?: string; tags: string[] }) =>
    request<Post>('/posts', { method: 'POST', body }),
  deletePost: (id: string) => request<void>(`/posts/${id}`, { method: 'DELETE' }),
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong'
