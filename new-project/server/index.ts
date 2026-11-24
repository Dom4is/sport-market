import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import { Prisma, PrismaClient } from '@prisma/client'
import { z, ZodError } from 'zod'

const requiredEnvironment = ['DATABASE_URL', 'JWT_SECRET'] as const
for (const key of requiredEnvironment) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`)
}
if (process.env.JWT_SECRET!.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long.')

const prisma = new PrismaClient()
const app = express()
const port = Number(process.env.API_PORT ?? 3001)
const jwtSecret = process.env.JWT_SECRET!

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; role: 'BUYER' | 'SELLER' }
  }
}

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '100kb' }))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const asyncHandler = (handler: (request: Request, response: Response) => Promise<unknown>): RequestHandler =>
  (request, response, next) => { void handler(request, response).catch(next) }

const authRequired: RequestHandler = (request, response, next) => {
  const authorization = request.header('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Требуется авторизация.' })
    return
  }

  try {
    const payload = jwt.verify(authorization.slice(7), jwtSecret)
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || (payload.role !== 'BUYER' && payload.role !== 'SELLER')) {
      response.status(401).json({ error: 'Недействительный токен.' })
      return
    }
    request.user = { id: payload.sub, role: payload.role }
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      response.status(401).json({ error: 'Сессия истекла или токен недействителен.' })
      return
    }
    next(error)
  }
}

const registerSchema = z.object({
  email: z.string().email().max(254).transform((email) => email.toLowerCase()),
  name: z.string().trim().min(2).max(60),
  password: z.string().min(10).max(72),
  role: z.enum(['BUYER', 'SELLER']).default('BUYER'),
})

const listingSchema = z.object({
  title: z.string().trim().min(4).max(100),
  description: z.string().trim().min(12).max(2000),
  category: z.string().trim().min(2).max(60),
  condition: z.enum(['Новое', 'Отличное', 'Хорошее']),
  price: z.number().int().positive().max(10_000_000),
  imageUrl: z.string().url().max(2048),
  location: z.string().trim().min(2).max(80),
})

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  condition: z.enum(['Новое', 'Отличное', 'Хорошее']).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

class RequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function routeParam(request: Request, name: string): string {
  const value = request.params[name]
  if (typeof value !== 'string') {
    throw new RequestError(400, 'Некорректный параметр маршрута.')
  }
  return value
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

app.post('/api/auth/register', authLimiter, asyncHandler(async (request, response) => {
  const input = registerSchema.parse(request.body)
  const passwordHash = await bcrypt.hash(input.password, 12)

  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash, role: input.role },
    select: { id: true, email: true, name: true, role: true },
  })
  const token = jwt.sign({ role: user.role }, jwtSecret, { subject: user.id, expiresIn: '7d' })
  response.status(201).json({ token, user })
}))

app.post('/api/auth/login', authLimiter, asyncHandler(async (request, response) => {
  const input = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(72) }).parse(request.body)
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    response.status(401).json({ error: 'Неверный email или пароль.' })
    return
  }
  const token = jwt.sign({ role: user.role }, jwtSecret, { subject: user.id, expiresIn: '7d' })
  response.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
}))

app.get('/api/listings', asyncHandler(async (request, response) => {
  const query = querySchema.parse(request.query)
  const where: Prisma.ListingWhereInput = {
    active: true,
    ...(query.category ? { category: query.category } : {}),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(query.q ? {
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
      ],
    } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined ? {
      price: {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      },
    } : {}),
  }
  const orderBy: Prisma.ListingOrderByWithRelationInput = query.sort === 'price-asc'
    ? { price: 'asc' }
    : query.sort === 'price-desc' ? { price: 'desc' } : { createdAt: 'desc' }
  const [items, total] = await prisma.$transaction([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { seller: { select: { id: true, name: true } } },
    }),
    prisma.listing.count({ where }),
  ])
  response.json({ items, total, page: query.page, pageSize: query.limit })
}))

app.get('/api/seller/listings', authRequired, asyncHandler(async (request, response) => {
  if (request.user?.role !== 'SELLER') {
    response.status(403).json({ error: 'Доступен только аккаунту продавца.' })
    return
  }
  const listings = await prisma.listing.findMany({
    where: { sellerId: request.user.id },
    include: { seller: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  response.json(listings)
}))

app.get('/api/listings/:id', asyncHandler(async (request, response) => {
  const listing = await prisma.listing.findFirst({
    where: { id: routeParam(request, 'id'), active: true },
    include: { seller: { select: { id: true, name: true } } },
  })
  if (!listing) {
    response.status(404).json({ error: 'Объявление не найдено.' })
    return
  }
  response.json(listing)
}))

app.post('/api/listings', authRequired, asyncHandler(async (request, response) => {
  if (request.user?.role !== 'SELLER') {
    response.status(403).json({ error: 'Для публикации нужен аккаунт продавца.' })
    return
  }
  const input = listingSchema.parse(request.body)
  const slug = `${input.title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-')}-${Date.now()}`
  const listing = await prisma.listing.create({
    data: { ...input, slug, sellerId: request.user.id },
  })
  response.status(201).json(listing)
}))

app.patch('/api/listings/:id', authRequired, asyncHandler(async (request, response) => {
  const input = listingSchema.partial().extend({ active: z.boolean().optional() }).parse(request.body)
  if (Object.keys(input).length === 0) {
    response.status(400).json({ error: 'Укажите хотя бы одно поле для изменения.' })
    return
  }
  const result = await prisma.listing.updateMany({
    where: { id: routeParam(request, 'id'), sellerId: request.user!.id, active: true },
    data: input,
  })
  if (result.count === 0) {
    response.status(404).json({ error: 'Активное объявление не найдено.' })
    return
  }
  const listing = await prisma.listing.findUniqueOrThrow({ where: { id: routeParam(request, 'id') } })
  response.json(listing)
}))

app.delete('/api/listings/:id', authRequired, asyncHandler(async (request, response) => {
  const result = await prisma.listing.updateMany({
    where: { id: routeParam(request, 'id'), sellerId: request.user!.id, active: true },
    data: { active: false },
  })
  if (result.count === 0) {
    response.status(404).json({ error: 'Активное объявление не найдено.' })
    return
  }
  response.status(204).end()
}))

app.get('/api/favorites', authRequired, asyncHandler(async (request, response) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: request.user!.id },
    include: { listing: { include: { seller: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
  response.json(favorites.map(({ listing }) => listing))
}))

app.put('/api/favorites/:listingId', authRequired, asyncHandler(async (request, response) => {
  const listingId = routeParam(request, 'listingId')
  const listing = await prisma.listing.findFirst({ where: { id: listingId, active: true }, select: { id: true } })
  if (!listing) {
    response.status(404).json({ error: 'Объявление не найдено.' })
    return
  }
  const favorite = await prisma.favorite.upsert({
    where: { userId_listingId: { userId: request.user!.id, listingId: listing.id } },
    create: { userId: request.user!.id, listingId: listing.id },
    update: {},
  })
  response.status(200).json({ saved: true, listingId: favorite.listingId })
}))

app.delete('/api/favorites/:listingId', authRequired, asyncHandler(async (request, response) => {
  await prisma.favorite.deleteMany({ where: { userId: request.user!.id, listingId: routeParam(request, 'listingId') } })
  response.status(204).end()
}))

app.post('/api/orders', authRequired, asyncHandler(async (request, response) => {
  const input = z.object({ listingIds: z.array(z.string().min(1)).min(1).max(10).refine((ids) => new Set(ids).size === ids.length, 'Повторяющиеся объявления.') }).parse(request.body)
  const order = await prisma.$transaction(async (transaction) => {
    const listings = await transaction.listing.findMany({
      where: { id: { in: input.listingIds }, active: true },
    })
    if (listings.length !== input.listingIds.length) {
      throw new RequestError(409, 'Одно или несколько объявлений уже недоступны.')
    }
    if (listings.some((listing) => listing.sellerId === request.user!.id)) {
      throw new RequestError(400, 'Нельзя оформить заказ на собственное объявление.')
    }
    const reservation = await transaction.listing.updateMany({
      where: { id: { in: input.listingIds }, active: true },
      data: { active: false },
    })
    if (reservation.count !== input.listingIds.length) {
      throw new RequestError(409, 'Одно или несколько объявлений уже куплены.')
    }
    const created = await transaction.order.create({
      data: {
        buyerId: request.user!.id,
        paymentMode: 'DEMO',
        status: 'PAID',
        totalPrice: listings.reduce((total, listing) => total + listing.price, 0),
        items: {
          create: listings.map((listing) => ({ listingId: listing.id, title: listing.title, price: listing.price })),
        },
      },
      include: { items: true },
    })
    return created
  })
  response.status(201).json({ ...order, notice: 'Демо-заказ создан; реальные деньги не списывались.' })
}))

app.get('/api/orders', authRequired, asyncHandler(async (request, response) => {
  const orders = await prisma.order.findMany({
    where: { buyerId: request.user!.id },
    include: { items: true, reviews: true },
    orderBy: { createdAt: 'desc' },
  })
  response.json(orders)
}))

app.get('/api/seller/orders', authRequired, asyncHandler(async (request, response) => {
  if (request.user?.role !== 'SELLER') {
    response.status(403).json({ error: 'Доступен только аккаунту продавца.' })
    return
  }
  const orders = await prisma.order.findMany({
    where: { items: { some: { listing: { sellerId: request.user.id } } } },
    include: {
      buyer: { select: { name: true } },
      items: { select: { id: true, listingId: true, title: true, price: true } },
      reviews: { select: { id: true, listingId: true, rating: true, comment: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  response.json(orders)
}))

app.patch('/api/orders/:id/status', authRequired, asyncHandler(async (request, response) => {
  const input = z.object({ status: z.enum(['SHIPPED', 'COMPLETED']) }).parse(request.body)
  const order = await prisma.order.findUnique({
    where: { id: routeParam(request, 'id') },
    include: { items: { include: { listing: { select: { sellerId: true } } } } },
  })
  if (!order) {
    response.status(404).json({ error: 'Заказ не найден.' })
    return
  }
  const isSeller = order.items.some((item) => item.listing.sellerId === request.user!.id)
  const canShip = input.status === 'SHIPPED' && isSeller && order.status === 'PAID'
  const canComplete = input.status === 'COMPLETED' && order.buyerId === request.user!.id && order.status === 'SHIPPED'
  if (!canShip && !canComplete) {
    response.status(403).json({ error: 'Недопустимый переход статуса для этого пользователя или заказа.' })
    return
  }
  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: input.status }, include: { items: true } })
  response.json(updated)
}))

app.post('/api/orders/:id/review', authRequired, asyncHandler(async (request, response) => {
  const input = z.object({
    listingId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(5).max(1000),
  }).parse(request.body)
  const order = await prisma.order.findUnique({
    where: { id: routeParam(request, 'id') },
    include: { items: true },
  })
  if (!order || order.buyerId !== request.user!.id) {
    response.status(404).json({ error: 'Завершённый заказ не найден.' })
    return
  }
  if (order.status !== 'COMPLETED' || !order.items.some((item) => item.listingId === input.listingId)) {
    response.status(409).json({ error: 'Отзыв доступен только на товар из завершённого заказа.' })
    return
  }
  const review = await prisma.review.create({
    data: { ...input, orderId: order.id, authorId: request.user!.id },
  })
  response.status(201).json(review)
}))

app.use((_request, response) => response.status(404).json({ error: 'Маршрут API не найден.' }))

app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  if (response.headersSent) {
    next(error)
    return
  }
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Проверьте введённые данные.', details: error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) })
    return
  }
  if (error instanceof RequestError) {
    response.status(error.status).json({ error: error.message })
    return
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '')
    const message = target.includes('email')
      ? 'Аккаунт с таким email уже существует.'
      : target.includes('orderId')
        ? 'Отзыв на этот товар уже оставлен.'
        : 'Запись с такими данными уже существует.'
    response.status(409).json({ error: message })
    return
  }
  console.error('API request failed:', error)
  response.status(500).json({ error: 'Внутренняя ошибка сервера.' })
})

const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`))

async function shutdown() {
  server.close()
  await prisma.$disconnect()
}

process.on('SIGINT', () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })
