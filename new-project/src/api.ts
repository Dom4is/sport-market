import { z } from 'zod'

const sellerSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const apiListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['Туризм', 'Велоспорт', 'Зимний спорт', 'Водный спорт', 'Одежда']),
  condition: z.enum(['Новое', 'Отличное', 'Хорошее']),
  price: z.number().int(),
  imageUrl: z.string(),
  location: z.string(),
  sellerId: z.string().optional(),
  seller: sellerSchema.optional(),
  createdAt: z.string().optional(),
  active: z.boolean().optional(),
})

export const apiListingPageSchema = z.object({
  items: z.array(apiListingSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['BUYER', 'SELLER']),
})

const orderSchema = z.object({
  id: z.string(),
  status: z.enum(['PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
  paymentMode: z.string(),
  totalPrice: z.number().int(),
  createdAt: z.string(),
  items: z.array(z.object({
    id: z.string(),
    listingId: z.string(),
    title: z.string(),
    price: z.number().int(),
  })),
  reviews: z.array(z.object({
    id: z.string(),
    listingId: z.string(),
    rating: z.number().int(),
    comment: z.string(),
  })).default([]),
  buyer: z.object({ name: z.string() }).optional(),
})

export const sessionSchema = z.object({
  token: z.string(),
  user: userSchema,
})

export type ApiListing = z.infer<typeof apiListingSchema>
export type ApiSession = z.infer<typeof sessionSchema>
export type ApiOrder = z.infer<typeof orderSchema>

const apiErrorSchema = z.object({ error: z.string() })

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, options)
  } catch {
    throw new ApiError('API недоступен. Продолжаем в режиме демо-каталога.')
  }

  const body: unknown = response.status === 204 ? undefined : await response.json().catch(() => null)
  if (!response.ok) {
    const error = apiErrorSchema.safeParse(body)
    throw new ApiError(error.success ? error.data.error : `Ошибка API (${response.status}).`, response.status)
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ApiError('API вернул данные в неожиданном формате.')
  }
  return result.data
}

function jsonRequest(method: string, body?: unknown, token?: string): RequestInit {
  return {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export function getListings(query: URLSearchParams, signal?: AbortSignal) {
  return request(`/listings?${query}`, apiListingPageSchema, { signal })
}

export function getFavorites(token: string) {
  return request('/favorites', z.array(apiListingSchema), jsonRequest('GET', undefined, token))
}

export function getSellerListings(token: string, signal?: AbortSignal) {
  return request('/seller/listings', z.array(apiListingSchema), { ...jsonRequest('GET', undefined, token), signal })
}

export function updateListingActive(listingId: string, active: boolean, token: string) {
  return request(`/listings/${encodeURIComponent(listingId)}`, apiListingSchema, jsonRequest('PATCH', { active }, token))
}

export function getOrders(token: string) {
  return request('/orders', z.array(orderSchema), jsonRequest('GET', undefined, token))
}

export function getSellerOrders(token: string) {
  return request('/seller/orders', z.array(orderSchema), jsonRequest('GET', undefined, token))
}

export function updateOrderStatus(orderId: string, status: 'SHIPPED' | 'COMPLETED', token: string) {
  return request(`/orders/${encodeURIComponent(orderId)}/status`, orderSchema, jsonRequest('PATCH', { status }, token))
}

export function createReview(orderId: string, input: { listingId: string; rating: number; comment: string }, token: string) {
  return request(
    `/orders/${encodeURIComponent(orderId)}/review`,
    z.object({ id: z.string(), listingId: z.string(), rating: z.number(), comment: z.string() }),
    jsonRequest('POST', input, token),
  )
}

export function setFavorite(listingId: string, saved: boolean, token: string) {
  const method = saved ? 'PUT' : 'DELETE'
  const schema = saved ? z.object({ saved: z.boolean(), listingId: z.string() }) : z.undefined()
  return request(`/favorites/${encodeURIComponent(listingId)}`, schema, jsonRequest(method, undefined, token))
}

export function register(input: { name: string; email: string; password: string; role: 'BUYER' | 'SELLER' }) {
  return request('/auth/register', sessionSchema, jsonRequest('POST', input))
}

export function login(input: { email: string; password: string }) {
  return request('/auth/login', sessionSchema, jsonRequest('POST', input))
}

export function createListing(
  input: { title: string; description: string; category: string; condition: string; price: number; imageUrl: string; location: string },
  token: string,
) {
  return request('/listings', apiListingSchema, jsonRequest('POST', input, token))
}

export function createOrder(listingIds: string[], token: string) {
  return request(
    '/orders',
    z.object({
      id: z.string(),
      status: z.string(),
      paymentMode: z.string(),
      totalPrice: z.number().int(),
      notice: z.string(),
    }),
    jsonRequest('POST', { listingIds }, token),
  )
}
