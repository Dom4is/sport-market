import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { ApiError, getListings, login, setFavorite } from '../src/api.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('getListings sends filters and parses a valid result', async () => {
  let requestedUrl = ''
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return Response.json({
      items: [{
        id: 'listing-1',
        title: 'Палатка',
        description: 'Для походов и треккинга',
        category: 'Туризм',
        condition: 'Отличное',
        price: 25000,
        imageUrl: 'https://example.test/tent.jpg',
        location: 'Москва',
        seller: { id: 'seller-1', name: 'Алексей' },
      }],
      total: 1,
      page: 1,
      pageSize: 50,
    })
  }

  const result = await getListings(new URLSearchParams({ q: 'лёгкая палатка', page: '1' }))

  assert.match(requestedUrl, /^\/api\/listings\?/)
  assert.match(requestedUrl, /q=/)
  assert.equal(result.items[0].title, 'Палатка')
  assert.equal(result.total, 1)
})

test('login surfaces API authentication errors', async () => {
  globalThis.fetch = async () => Response.json({ error: 'Неверный email или пароль.' }, { status: 401 })

  await assert.rejects(
    login({ email: 'user@example.test', password: 'wrong-password' }),
    (error) => error instanceof ApiError && error.status === 401 && error.message === 'Неверный email или пароль.',
  )
})

test('removing a favorite accepts an empty 204 response', async () => {
  let requestMethod = ''
  globalThis.fetch = async (_input, init) => {
    requestMethod = init?.method ?? ''
    return new Response(null, { status: 204 })
  }

  await setFavorite('listing-1', false, 'test-token')
  assert.equal(requestMethod, 'DELETE')
})
