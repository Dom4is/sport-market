import { useEffect, useMemo, useState } from 'react'
import { ApiError, type ApiListing, type ApiOrder, type ApiSession, createListing, createOrder, createReview, getFavorites, getListings, getOrders, getSellerListings, getSellerOrders, login, register, setFavorite, updateListingActive, updateOrderStatus } from './api'
import './App.css'

type Category = 'Всё снаряжение' | 'Туризм' | 'Велоспорт' | 'Зимний спорт' | 'Водный спорт' | 'Одежда'
type Condition = 'Новое' | 'Отличное' | 'Хорошее'

type Listing = {
  id: string
  title: string
  category: Category
  condition: Condition
  price: number
  oldPrice?: number
  image: string
  seller: string
  location: string
  rating: string
  badge?: string
  description: string
  sellerId?: string
  isOwner?: boolean
  isRemote?: boolean
  sequence?: number
  active?: boolean
}

const initialListings: Listing[] = [
  {
    id: 'demo-1',
    title: 'Палатка MSR Hubba Hubba NX',
    category: 'Туризм',
    condition: 'Отличное',
    price: 32900,
    oldPrice: 48900,
    image: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=900&q=85',
    seller: 'Алексей',
    location: 'Москва',
    rating: '4.9',
    badge: 'Хорошая цена',
    description: 'Лёгкая двухместная палатка для треккинга. Использовалась в трёх походах, без повреждений и следов ремонта. В комплекте родные дуги, колышки и чехол.',
  },
  {
    id: 'demo-2',
    title: 'Велосипед gravel Specialized Diverge',
    category: 'Велоспорт',
    condition: 'Хорошее',
    price: 118000,
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=85',
    seller: 'Мария',
    location: 'Санкт-Петербург',
    rating: '5.0',
    badge: 'Проверен',
    description: 'Gravel-велосипед для длинных маршрутов и грунтовых дорог. Размер рамы 54, Shimano GRX, обслужен в этом сезоне.',
  },
  {
    id: 'demo-3',
    title: 'Куртка Patagonia Torrentshell 3L',
    category: 'Одежда',
    condition: 'Отличное',
    price: 14900,
    oldPrice: 23900,
    image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=900&q=85',
    seller: 'Илья',
    location: 'Казань',
    rating: '4.8',
    description: 'Трёхслойная мембранная куртка, размер M. Мембрана в отличном состоянии, молнии и проклейка швов проверены.',
  },
  {
    id: 'demo-4',
    title: 'Рюкзак Osprey Atmos AG 65',
    category: 'Туризм',
    condition: 'Хорошее',
    price: 21400,
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=85',
    seller: 'Денис',
    location: 'Екатеринбург',
    rating: '4.9',
    badge: 'Проверен',
    description: 'Вместительный рюкзак для автономных походов. Объём 65 л, размер L/XL. Есть небольшие следы использования, все пряжки и швы целы.',
  },
  {
    id: 'demo-5',
    title: 'Лыжи Salomon QST 92 + крепления',
    category: 'Зимний спорт',
    condition: 'Хорошее',
    price: 46500,
    image: 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?auto=format&fit=crop&w=900&q=85',
    seller: 'Ольга',
    location: 'Новосибирск',
    rating: '4.7',
    description: 'Универсальные лыжи длиной 176 см с креплениями Warden. Канты ровные, скользяк подготовлен к сезону.',
  },
  {
    id: 'demo-6',
    title: 'Гидрокостюм для серфинга O’Neill',
    category: 'Водный спорт',
    condition: 'Новое',
    price: 18900,
    oldPrice: 26900,
    image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=85',
    seller: 'Кирилл',
    location: 'Сочи',
    rating: '5.0',
    badge: 'Новый',
    description: 'Гидрокостюм толщиной 3/2 мм, размер M. Куплен в подарок, ни разу не надевался. Подойдёт для прохладной воды.',
  },
  {
    id: 'demo-7',
    title: 'Треккинговые ботинки Salewa Mountain Trainer',
    category: 'Туризм',
    condition: 'Отличное',
    price: 17600,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
    seller: 'Анастасия',
    location: 'Пермь',
    rating: '4.9',
    description: 'Кожаные ботинки с мембраной Gore-Tex, размер 42. Подошва без критичного износа, внутри чистые.',
  },
  {
    id: 'demo-8',
    title: 'Палатка Naturehike Cloud Up 2',
    category: 'Туризм',
    condition: 'Хорошее',
    price: 9200,
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=85',
    seller: 'Павел',
    location: 'Ярославль',
    rating: '4.6',
    description: 'Лёгкая палатка для двух человек. Есть небольшой след от костра на чехле, сама палатка целая.',
  },
]

initialListings.forEach((listing, index) => {
  listing.sequence = initialListings.length - index
})

const categories: Category[] = ['Всё снаряжение', 'Туризм', 'Велоспорт', 'Зимний спорт', 'Водный спорт', 'Одежда']
const money = new Intl.NumberFormat('ru-RU')

function mapApiListing(listing: ApiListing, userId?: string): Listing {
  const sellerId = listing.sellerId ?? listing.seller?.id
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    condition: listing.condition,
    price: listing.price,
    image: listing.imageUrl,
    seller: listing.seller?.name ?? 'Продавец',
    location: listing.location,
    rating: '—',
    description: listing.description,
    sellerId,
    isOwner: Boolean(userId && sellerId === userId),
    isRemote: true,
    sequence: listing.createdAt ? Date.parse(listing.createdAt) : 0,
    active: listing.active ?? true,
    badge: listing.active === false ? 'Снято' : undefined,
  }
}

type AccountModalProps = {
  session: ApiSession | null
  mode: 'login' | 'register'
  form: { name: string; email: string; password: string; role: 'BUYER' | 'SELLER' }
  busy: boolean
  orders: ApiOrder[]
  onClose: () => void
  onModeChange: (mode: 'login' | 'register') => void
  onFormChange: (form: AccountModalProps['form']) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onSignOut: () => void
  onOrderStatusChange: (orderId: string, status: 'SHIPPED' | 'COMPLETED') => void
  onReviewSubmit: (orderId: string, listingId: string, rating: number, comment: string) => void
}

function AccountModal({ session, mode, form, busy, orders, onClose, onModeChange, onFormChange, onSubmit, onSignOut, onOrderStatusChange, onReviewSubmit }: AccountModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-card account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button className="modal-close" aria-label="Закрыть" onClick={onClose}><Icon name="close" /></button>
        <span className="modal-kicker">СВОЙ МАРШРУТ НА ТРОПЕ</span>
        {session ? (
          <>
            <h2 id="account-title">Привет, {session.user.name}</h2>
            <p className="modal-intro">{session.user.email} · {session.user.role === 'SELLER' ? 'продавец' : 'покупатель'}</p>
            <section className="account-orders" aria-label="Заказы">
              <h3>{session.user.role === 'SELLER' ? 'Заказы покупателей' : 'Мои заказы'}</h3>
              {orders.length === 0 ? <p className="account-empty">Здесь появятся твои заказы.</p> : orders.map((order) => (
                <article className="account-order" key={order.id}>
                  <div className="account-order-heading"><strong>Заказ {order.id.slice(-7)}</strong><span>{order.status === 'PAID' ? 'Оплачен · демо' : order.status === 'SHIPPED' ? 'Отправлен' : order.status === 'COMPLETED' ? 'Завершён' : 'Отменён'}</span></div>
                  {order.items.map((item) => {
                    const review = order.reviews.find((entry) => entry.listingId === item.listingId)
                    return <div className="account-order-item" key={item.id}>
                      <div><strong>{item.title}</strong><small>{money.format(item.price)} ₽</small></div>
                      {session.user.role === 'BUYER' && order.status === 'COMPLETED' && (review
                        ? <p className="account-review-saved">Твой отзыв: ★ {review.rating}</p>
                        : <form className="review-form" onSubmit={(event) => {
                          event.preventDefault()
                          const formData = new FormData(event.currentTarget)
                          onReviewSubmit(order.id, item.listingId, Number(formData.get('rating')), String(formData.get('comment') ?? ''))
                        }}>
                          <label>Оценка<select name="rating" defaultValue="5"><option value="5">5 — отлично</option><option value="4">4 — хорошо</option><option value="3">3 — нормально</option><option value="2">2 — плохо</option><option value="1">1 — очень плохо</option></select></label>
                          <label>Отзыв<textarea name="comment" required minLength={5} maxLength={1000} rows={2} placeholder="Расскажи о покупке" /></label>
                          <button type="submit">Оставить отзыв</button>
                        </form>)}
                    </div>
                  })}
                  {session.user.role === 'SELLER' && order.status === 'PAID' && <button className="order-status-button" onClick={() => onOrderStatusChange(order.id, 'SHIPPED')}>Отметить отправленным</button>}
                  {session.user.role === 'BUYER' && order.status === 'SHIPPED' && <button className="order-status-button" onClick={() => onOrderStatusChange(order.id, 'COMPLETED')}>Подтвердить получение</button>}
                </article>
              ))}
            </section>
            <div className="account-actions">
              <button className="button button-outline" onClick={onClose}>Продолжить покупки</button>
              <button className="button button-dark" onClick={onSignOut}>Выйти</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="account-title">{mode === 'register' ? 'Создать аккаунт' : 'Рады снова видеть'}</h2>
            <p className="modal-intro">Войди, чтобы сохранять вещи и оформлять заказы.</p>
            <div className="auth-tabs">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => onModeChange('login')}>Вход</button>
              <button className={mode === 'register' ? 'active' : ''} onClick={() => onModeChange('register')}>Регистрация</button>
            </div>
            <form className="listing-form" onSubmit={onSubmit}>
              {mode === 'register' && <>
                <label>Имя<input required minLength={2} maxLength={60} autoComplete="name" value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} /></label>
                <label>Я хочу<select value={form.role} onChange={(event) => onFormChange({ ...form, role: event.target.value as 'BUYER' | 'SELLER' })}><option value="BUYER">Покупать экипировку</option><option value="SELLER">Продавать экипировку</option></select></label>
              </>}
              <label>Email<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => onFormChange({ ...form, email: event.target.value })} /></label>
              <label>Пароль<input required type="password" minLength={mode === 'register' ? 10 : 1} maxLength={72} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => onFormChange({ ...form, password: event.target.value })} /></label>
              {mode === 'register' && <p className="demo-caption"><Icon name="shield" size={16} /> Минимум 10 символов. Пароль хранится в виде хеша.</p>}
              <button className="button button-dark modal-submit" disabled={busy} type="submit">{busy ? 'Подождите…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'} <Icon name="arrow" size={17} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

function Icon({ name, size = 20 }: { name: 'search' | 'heart' | 'bag' | 'user' | 'arrow' | 'close' | 'pin' | 'shield' | 'plus' | 'check'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }

  if (name === 'search') return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
  if (name === 'heart') return <svg {...common}><path d="M20.8 8.7c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" /></svg>
  if (name === 'bag') return <svg {...common}><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7" /></svg>
  if (name === 'close') return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>
  if (name === 'pin') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
  if (name === 'shield') return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
}

function App() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('Всё снаряжение')
  const [condition, setCondition] = useState('Любое состояние')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('recommended')
  const [page, setPage] = useState(1)
  const [apiTotal, setApiTotal] = useState(0)
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [cart, setCart] = useState<Listing[]>([])
  const [modal, setModal] = useState<'listing' | 'cart' | 'details' | 'success' | 'account' | null>(null)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [listings, setListings] = useState(initialListings)
  const [toast, setToast] = useState('')
  const [listingForm, setListingForm] = useState({ title: '', category: 'Туризм' as Category, price: '', condition: 'Отличное' as Condition, description: '' })
  const [isSellerMode, setIsSellerMode] = useState(false)
  const [session, setSession] = useState<ApiSession | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'BUYER' as 'BUYER' | 'SELLER' })
  const [authBusy, setAuthBusy] = useState(false)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [ordersRevision, setOrdersRevision] = useState(0)
  const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting')
  const [apiMessage, setApiMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('Это портфолио-демо: оплата не проводилась, деньги не списывались.')

  const visibleListings = useMemo(() => {
    const normalizedQuery = submittedQuery.trim().toLocaleLowerCase('ru')
    const filtered = listings.filter((listing) => {
      const matchesQuery = !normalizedQuery || `${listing.title} ${listing.category} ${listing.description} ${listing.location}`.toLocaleLowerCase('ru').includes(normalizedQuery)
      const matchesCategory = activeCategory === 'Всё снаряжение' || listing.category === activeCategory
      const matchesCondition = condition === 'Любое состояние' || listing.condition === condition
      const matchesPrice = !maxPrice || listing.price <= Number(maxPrice)
      const matchesSeller = !isSellerMode || listing.isOwner || listing.seller === 'Вы'
      const matchesFavorites = !favoritesOnly || favorites.includes(listing.id)
      const matchesActive = isSellerMode || listing.active !== false
      return matchesQuery && matchesCategory && matchesCondition && matchesPrice && matchesSeller && matchesFavorites && matchesActive
    })

    return filtered.sort((first, second) => {
      if (sort === 'price-asc') return first.price - second.price
      if (sort === 'price-desc') return second.price - first.price
      return (second.sequence ?? 0) - (first.sequence ?? 0)
    })
  }, [activeCategory, condition, favorites, favoritesOnly, isSellerMode, listings, maxPrice, sort, submittedQuery])

  useEffect(() => {
    if (apiStatus === 'offline') return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      if (isSellerMode && session?.user.role === 'SELLER') {
        void getSellerListings(session.token, controller.signal).then((result) => {
          if (controller.signal.aborted) return
          setListings(result.map((listing) => mapApiListing(listing, session.user.id)))
          setApiTotal(result.length)
          setApiStatus('connected')
          setApiMessage('')
        }).catch((error: unknown) => {
          if (controller.signal.aborted) return
          setApiStatus('offline')
          setApiMessage(error instanceof Error ? error.message : 'Не удалось загрузить объявления продавца.')
        })
        return
      }

      const queryParams = new URLSearchParams({ page: '1', limit: '50' })
      queryParams.set('page', String(page))
      queryParams.set('limit', '9')
      if (submittedQuery) queryParams.set('q', submittedQuery)
      if (activeCategory !== 'Всё снаряжение') queryParams.set('category', activeCategory)
      if (condition !== 'Любое состояние') queryParams.set('condition', condition)
      if (maxPrice) queryParams.set('maxPrice', maxPrice)
      queryParams.set('sort', sort === 'recommended' ? 'newest' : sort)

      void getListings(queryParams, controller.signal).then((result) => {
        if (controller.signal.aborted) return
        const nextListings = result.items.map((listing) => mapApiListing(listing, session?.user.id))
        setListings((current) => page === 1 ? nextListings : [...current, ...nextListings])
        setApiTotal(result.total)
        setApiStatus('connected')
        setApiMessage('')
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return
        setApiStatus('offline')
        setApiMessage(error instanceof Error ? error.message : 'Не удалось загрузить каталог из API.')
      })
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [activeCategory, apiStatus, condition, isSellerMode, maxPrice, page, session, sort, submittedQuery])

  useEffect(() => {
    if (!session || apiStatus !== 'connected') return
    void getFavorites(session.token).then((items) => {
      setFavorites(items.map((item) => item.id))
    }).catch((error: unknown) => {
      setApiMessage(error instanceof Error ? error.message : 'Не удалось загрузить избранное.')
    })
  }, [apiStatus, session])

  useEffect(() => {
    if (!session || apiStatus !== 'connected') return

    let active = true
    const fetchOrders = session.user.role === 'SELLER' ? getSellerOrders : getOrders
    void fetchOrders(session.token).then((result) => {
      if (active) setOrders(result)
    }).catch((error: unknown) => {
      if (active) setApiMessage(error instanceof Error ? error.message : 'Не удалось загрузить заказы.')
    })

    return () => { active = false }
  }, [apiStatus, ordersRevision, session])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const toggleFavorite = async (id: string) => {
    const alreadySaved = favorites.includes(id)
    const listing = listings.find((item) => item.id === id)
    if (listing?.isRemote) {
      if (!session) {
        setModal('account')
        notify('Войди, чтобы сохранять вещи в избранное')
        return
      }
      try {
        await setFavorite(id, !alreadySaved, session.token)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Не удалось обновить избранное.')
        return
      }
    }
    setFavorites((current) => alreadySaved ? current.filter((favorite) => favorite !== id) : [...current, id])
    notify(alreadySaved ? 'Удалено из избранного' : 'Добавлено в избранное')
  }

  const addToCart = (listing: Listing) => {
    if (listing.isOwner || listing.seller === 'Вы') {
      notify('Нельзя купить собственное объявление')
      return
    }
    if (cart.some((item) => item.id === listing.id)) {
      notify('Уже в корзине')
      return
    }
    setCart((current) => [...current, listing])
    notify('Добавлено в корзину')
  }

  const resetFilters = () => {
    setPage(1)
    setQuery('')
    setSubmittedQuery('')
    setActiveCategory('Всё снаряжение')
    setCondition('Любое состояние')
    setMaxPrice('')
    setSort('recommended')
    setIsSellerMode(false)
    setFavoritesOnly(false)
  }

  const showFavorites = () => {
    setPage(1)
    setQuery('')
    setSubmittedQuery('')
    setActiveCategory('Всё снаряжение')
    setCondition('Любое состояние')
    setMaxPrice('')
    setSort('recommended')
    setIsSellerMode(false)
    setFavoritesOnly(true)
    if (!favorites.length) notify('Пока нет избранного')
  }

  const openSellerDashboard = () => {
    setFavoritesOnly(false)
    if (session?.user.role === 'SELLER' || !session) {
      if (!session) {
        setAuthMode('register')
        setAuthForm((current) => ({ ...current, role: 'SELLER' }))
        setModal('account')
        notify('Войди или зарегистрируйся как продавец')
        return
      }
      setIsSellerMode(true)
      setPage(1)
      return
    }
    setModal('account')
    notify('Выйди из аккаунта покупателя и зарегистрируй аккаунт продавца')
  }

  const loadMore = () => {
    if (apiStatus === 'connected' && !isSellerMode && page * 9 < apiTotal) {
      setPage((current) => current + 1)
      return
    }
    notify('Все доступные объявления уже показаны')
  }

  const submitListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (apiStatus === 'connected') {
      if (!session || session.user.role !== 'SELLER') {
        setAuthForm((current) => ({ ...current, role: 'SELLER' }))
        setAuthMode('register')
        setModal('account')
        notify('Для публикации войди как продавец')
        return
      }
      try {
        const created = await createListing({
          title: listingForm.title.trim(),
          category: listingForm.category,
          condition: listingForm.condition,
          price: Number(listingForm.price),
          description: listingForm.description.trim(),
          imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=85',
          location: 'Москва',
        }, session.token)
        const newListing = mapApiListing({
          ...created,
          seller: { id: session.user.id, name: session.user.name },
          sellerId: session.user.id,
        }, session.user.id)
        setListings((current) => [newListing, ...current])
        setPage(1)
        setListingForm({ title: '', category: 'Туризм', price: '', condition: 'Отличное', description: '' })
        setModal(null)
        setIsSellerMode(true)
        setFavoritesOnly(false)
        setActiveCategory('Всё снаряжение')
        setCondition('Любое состояние')
        setMaxPrice('')
        setSort('recommended')
        setQuery('')
        setSubmittedQuery('')
        notify('Объявление опубликовано')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Не удалось опубликовать объявление.')
      }
      return
    }

    const newListing: Listing = {
      id: `demo-${Date.now()}`,
      title: listingForm.title.trim(),
      category: listingForm.category,
      condition: listingForm.condition,
      price: Number(listingForm.price),
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=85',
      seller: 'Вы',
      location: 'Ваш город',
      rating: '—',
      badge: 'Новое объявление',
      description: listingForm.description.trim(),
      sequence: Date.now(),
    }
    setListings((current) => [newListing, ...current])
    setPage(1)
    setListingForm({ title: '', category: 'Туризм', price: '', condition: 'Отличное', description: '' })
    setModal(null)
    setIsSellerMode(true)
    setFavoritesOnly(false)
    setActiveCategory('Всё снаряжение')
    setCondition('Любое состояние')
    setMaxPrice('')
    setSort('recommended')
    setQuery('')
    setSubmittedQuery('')
    notify('Объявление опубликовано в демо-режиме')
  }

  const toggleListingVisibility = async (listing: Listing) => {
    const active = listing.active === false
    if (listing.isRemote && session) {
      try {
        const updated = await updateListingActive(listing.id, active, session.token)
        const nextListing = mapApiListing({
          ...updated,
          seller: { id: session.user.id, name: session.user.name },
          sellerId: session.user.id,
        }, session.user.id)
        setListings((current) => current.map((item) => item.id === listing.id ? nextListing : item))
        notify(active ? 'Объявление снова активно' : 'Объявление снято с продажи')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Не удалось изменить объявление.')
      }
      return
    }

    setListings((current) => current.map((item) => item.id === listing.id
      ? { ...item, active, badge: active ? undefined : 'Снято' }
      : item))
    notify(active ? 'Объявление снова активно' : 'Объявление снято с продажи')
  }

  const completeDemoOrder = async () => {
    const remoteItems = cart.filter((item) => item.isRemote)
    if (remoteItems.length > 0) {
      if (remoteItems.length !== cart.length) {
        notify('Очисти корзину и добавь товары из одного режима')
        return
      }
      if (!session) {
        setModal('account')
        notify('Войди, чтобы оформить заказ')
        return
      }
      try {
        const order = await createOrder(remoteItems.map((item) => item.id), session.token)
        setSuccessMessage(order.notice)
        const purchasedIds = new Set(remoteItems.map((item) => item.id))
        setListings((current) => current.filter((item) => !purchasedIds.has(item.id)))
        setFavorites((current) => current.filter((id) => !purchasedIds.has(id)))
        setOrdersRevision((current) => current + 1)
        setCart([])
        setModal('success')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Не удалось оформить заказ.')
      }
      return
    }
    setCart([])
    setModal('success')
  }

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    try {
      const nextSession = authMode === 'register'
        ? await register(authForm)
        : await login({ email: authForm.email, password: authForm.password })
      setSession(nextSession)
      setIsSellerMode(nextSession.user.role === 'SELLER')
      setModal(null)
      notify(`С возвращением, ${nextSession.user.name}`)
    } catch (error) {
      notify(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Не удалось войти.')
    } finally {
      setAuthBusy(false)
    }
  }

  const changeOrderStatus = async (orderId: string, status: 'SHIPPED' | 'COMPLETED') => {
    if (!session) return
    try {
      await updateOrderStatus(orderId, status, session.token)
      setOrdersRevision((current) => current + 1)
      notify(status === 'SHIPPED' ? 'Заказ отмечен как отправленный' : 'Заказ завершён')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось изменить статус заказа.')
    }
  }

  const submitReview = async (orderId: string, listingId: string, rating: number, comment: string) => {
    if (!session) return
    try {
      await createReview(orderId, { listingId, rating, comment }, session.token)
      setOrdersRevision((current) => current + 1)
      notify('Спасибо за отзыв')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось отправить отзыв.')
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" onClick={(event) => { event.preventDefault(); resetFilters() }} aria-label="Тропа — на главную">
            <span className="brand-mark">т.</span>
            <span className="brand-name">тропа<span className="brand-dot">.</span></span>
          </a>
          <nav className="main-nav" aria-label="Основная навигация">
            <button className={`nav-link ${!isSellerMode && !favoritesOnly ? 'is-active' : ''}`} onClick={() => { setIsSellerMode(false); setFavoritesOnly(false); setSubmittedQuery(''); setPage(1) }}>Каталог</button>
            <button className={`nav-link ${isSellerMode ? 'is-active' : ''}`} onClick={openSellerDashboard}>Мои объявления</button>
            <a className="nav-link" href="#how-it-works">Как это работает</a>
          </nav>
          <div className="header-actions">
            <button className="icon-button favorite-link" aria-label={`Избранное, ${favorites.length} товаров`} onClick={showFavorites}>
              <Icon name="heart" /><span className="action-label">Избранное</span>{favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}
            </button>
            <button className="icon-button cart-button" aria-label={`Корзина, ${cart.length} товаров`} onClick={() => setModal('cart')}>
              <Icon name="bag" /><span className="action-label">Корзина</span>{cart.length > 0 && <span className="count-badge">{cart.length}</span>}
            </button>
            <button className="profile-button" onClick={() => setModal('account')} aria-label={session ? `Профиль: ${session.user.name}` : 'Войти или зарегистрироваться'}>{session ? session.user.name.slice(0, 1).toUpperCase() : <Icon name="user" />}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" />ВЫХОДИ ЗА РАМКИ</div>
            <h1>Снаряжение<br />для <em>больших</em> планов.</h1>
            <p className="hero-description">Находи вещи с историей. Отдавай тем, кто продолжит её — на тропе, в горах и за городом.</p>
            <div className="hero-actions">
              <a className="button button-dark" href="#catalog">Исследовать каталог <Icon name="arrow" size={18} /></a>
              <button className="button button-text" onClick={() => setModal('listing')}><Icon name="plus" size={18} /> Продать снаряжение</button>
            </div>
            <div className="hero-proof"><span className="proof-avatars"><i>А</i><i>М</i><i>И</i></span><span>Уже выбрали свой маршрут <strong>2 400+</strong> человек</span></div>
          </div>
          <div className="hero-art">
            <div className="hero-image" role="img" aria-label="Палатка в горах на закате" />
            <div className="hero-image-note"><span className="note-dot" />Хорошее снаряжение путешествует дальше</div>
            <div className="hero-stamp"><span>ВЕЩИ<br />С ИСТОРИЕЙ</span><strong>↗</strong></div>
          </div>
          <div className="hero-index">01 — 04 <span /></div>
        </section>

        <section className="trust-strip" id="how-it-works">
          <div className="trust-item"><span className="trust-icon"><Icon name="shield" size={19} /></span><span><strong>Проверенные вещи</strong><small>Описание и фото от владельца</small></span></div>
          <div className="trust-item"><span className="trust-icon trust-icon-sun">✳</span><span><strong>Осознанный выбор</strong><small>Меньше нового — больше приключений</small></span></div>
          <div className="trust-item"><span className="trust-icon"><Icon name="pin" size={19} /></span><span><strong>По всей России</strong><small>Находи рядом или заказывай доставку</small></span></div>
          <a className="trust-link" href="#catalog">Узнать больше <Icon name="arrow" size={16} /></a>
        </section>

        <section className="catalog-section" id="catalog">
          <div className="section-heading">
            <div>
              <div className="eyebrow section-eyebrow"><span className="eyebrow-line" />СЛЕДУЮЩАЯ ОСТАНОВКА — СНАРЯЖЕНИЕ</div>
              <h2>{isSellerMode ? 'Мои объявления' : favoritesOnly ? 'Избранное' : 'Найди своё снаряжение'}</h2>
            </div>
            <div className="catalog-count">{apiStatus === 'connected' && !isSellerMode && !favoritesOnly ? apiTotal : visibleListings.length} вещей <span>{favoritesOnly ? 'в избранном' : isSellerMode ? 'в твоём магазине' : 'для новых историй'}</span></div>
          </div>

          <div className={`api-notice api-notice-${apiStatus}`} role="status">
            <span className="api-indicator" />
            <span>{apiStatus === 'connected' ? 'Каталог подключён к API и PostgreSQL' : apiStatus === 'connecting' ? 'Подключаем каталог…' : 'Ошибка API · локальный демо-каталог'}</span>
            {apiStatus === 'offline' && <><span className="api-notice-message">{apiMessage}</span><button onClick={() => setApiStatus('connecting')}>Повторить</button></>}
          </div>

          <form className="search-bar" onSubmit={(event) => { event.preventDefault(); setSubmittedQuery(query); setPage(1) }}>
            <Icon name="search" size={21} />
            <input aria-label="Поиск снаряжения" placeholder="Например, палатка для двоих" value={query} onChange={(event) => setQuery(event.target.value)} />
            {query && <button className="search-clear" type="button" aria-label="Очистить поиск" onClick={() => { setQuery(''); setSubmittedQuery(''); setPage(1) }}><Icon name="close" size={17} /></button>}
            <span className="search-divider" />
            <button className="search-submit" type="submit">Найти <Icon name="arrow" size={17} /></button>
          </form>

          <div className="category-row" aria-label="Категории товаров">
            {categories.map((category, index) => (
              <button key={category} className={`category-chip ${activeCategory === category ? 'selected' : ''}`} onClick={() => { setActiveCategory(category); setPage(1) }}>
                <span className="category-emoji">{['✳', '⌁', '↗', '❄', '≈', '◌'][index]}</span>{category}
              </button>
            ))}
          </div>

          <div className="catalog-layout">
            <aside className="filters-panel" aria-label="Фильтры каталога">
              <div className="filters-heading"><h3>Фильтры</h3><button onClick={resetFilters}>Сбросить</button></div>
              <div className="filter-group">
                <label htmlFor="max-price">Цена, до</label>
                <div className="price-input"><input id="max-price" inputMode="numeric" placeholder="Любая" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value.replace(/\D/g, '')); setPage(1) }} /><span>₽</span></div>
                <div className="price-presets"><button onClick={() => { setMaxPrice('10000'); setPage(1) }} type="button">до 10 тыс.</button><button onClick={() => { setMaxPrice('30000'); setPage(1) }} type="button">до 30 тыс.</button></div>
              </div>
              <div className="filter-group">
                <label htmlFor="condition">Состояние</label>
                <select id="condition" value={condition} onChange={(event) => { setCondition(event.target.value); setPage(1) }}>
                  <option>Любое состояние</option><option>Новое</option><option>Отличное</option><option>Хорошее</option>
                </select>
              </div>
              <div className="filter-group location-filter">
                <label>Местоположение</label>
                <button className="location-select" onClick={() => notify('Скоро: поиск по городу и радиусу')}><Icon name="pin" size={17} /> Вся Россия <span>⌄</span></button>
              </div>
              <div className="seller-card">
                <span className="seller-spark">✳</span>
                <strong>Есть что<br />рассказать?</strong>
                <p>Дай своему снаряжению новое приключение.</p>
                <button onClick={() => setModal('listing')}>Разместить объявление <Icon name="arrow" size={15} /></button>
              </div>
            </aside>

            <div className="products-area">
              <div className="products-toolbar">
                <p>{submittedQuery ? <>Результаты по запросу <strong>«{submittedQuery}»</strong></> : isSellerMode ? 'Ваши опубликованные вещи' : 'Подобрали для новых маршрутов'}</p>
                <label className="sort-control">Сортировка <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}><option value="recommended">Сначала интересное</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select></label>
              </div>
              {visibleListings.length > 0 ? (
                <div className="product-grid">
                  {visibleListings.map((listing) => (
                    <article className="product-card" key={listing.id}>
                      <button className="product-image-wrap" onClick={() => { setSelectedListing(listing); setModal('details') }} aria-label={`Подробнее: ${listing.title}`}>
                        <img src={listing.image} alt="" className="product-image" loading="lazy" />
                        {listing.badge && <span className="product-badge">{listing.badge}</span>}
                        <span className="product-category">{listing.category}</span>
                      </button>
                      <button className={`favorite-button ${favorites.includes(listing.id) ? 'is-favorite' : ''}`} aria-label={favorites.includes(listing.id) ? 'Убрать из избранного' : 'Добавить в избранное'} onClick={() => toggleFavorite(listing.id)}><Icon name="heart" size={18} /></button>
                      <div className="product-content">
                        <div className="product-meta"><span>{listing.condition}</span><span className="meta-dot">·</span><span><span className="rating-star">★</span> {listing.rating}</span></div>
                        <button className="product-title" onClick={() => { setSelectedListing(listing); setModal('details') }}>{listing.title}</button>
                        <div className="product-location"><Icon name="pin" size={13} /> {listing.location}</div>
                        <div className="product-footer"><div className="product-price">{money.format(listing.price)} ₽{listing.oldPrice && <del>{money.format(listing.oldPrice)} ₽</del>}</div>{isSellerMode && (listing.isOwner || listing.seller === 'Вы') ? <button className="listing-state-button" onClick={() => { void toggleListingVisibility(listing) }}>{listing.active === false ? 'Опубликовать' : 'Снять'}</button> : <button className="quick-add" aria-label={`Добавить в корзину: ${listing.title}`} onClick={() => addToCart(listing)}><Icon name="plus" size={17} /></button>}</div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><span className="empty-icon">⌕</span><h3>Пока ничего не нашли</h3><p>Попробуй изменить поиск или сбросить фильтры.</p><button className="button button-outline" onClick={resetFilters}>Сбросить фильтры</button></div>
              )}
              {visibleListings.length > 0 && apiStatus === 'connected' && !isSellerMode && page * 9 < apiTotal && <button className="load-more" onClick={loadMore}>Показать ещё <Icon name="arrow" size={17} /></button>}
            </div>
          </div>
        </section>

        <section className="closing-banner">
          <div className="closing-copy"><span className="eyebrow"><span className="eyebrow-line" />НЕ ВЕЩЬ, А ЧАСТЬ ИСТОРИИ</span><h2>Пусть хорошее<br />снаряжение <em>живёт.</em></h2><p>Каждая покупка здесь — это меньше новых вещей и больше осознанных маршрутов.</p><button className="button button-light" onClick={() => setModal('listing')}>Продать снаряжение <Icon name="arrow" size={18} /></button></div>
          <div className="closing-image" role="img" aria-label="Горы и палатка на природе" />
        </section>
      </main>

      {modal === 'account' && <AccountModal
        session={session}
        mode={authMode}
        form={authForm}
        busy={authBusy}
        orders={orders}
        onClose={() => setModal(null)}
        onModeChange={setAuthMode}
        onFormChange={setAuthForm}
        onSubmit={submitAuth}
        onSignOut={() => { setSession(null); setFavorites([]); setOrders([]); setIsSellerMode(false); setModal(null); notify('Ты вышел из аккаунта') }}
        onOrderStatusChange={changeOrderStatus}
        onReviewSubmit={submitReview}
      />}

      <footer className="site-footer"><a className="brand footer-brand" href="#"><span className="brand-mark">т.</span><span className="brand-name">тропа<span className="brand-dot">.</span></span></a><p>Хорошие вещи. Дальние маршруты.</p><span className="footer-note">Демо-проект · 2026</span></footer>

      {modal === 'listing' && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="listing-title"><button className="modal-close" aria-label="Закрыть" onClick={() => setModal(null)}><Icon name="close" /></button><span className="modal-kicker">ДАЙ ВЕЩИ ВТОРУЮ ЖИЗНЬ</span><h2 id="listing-title">Новое объявление</h2><p className="modal-intro">Расскажи о снаряжении — следующий маршрут уже ждёт.</p><form className="listing-form" onSubmit={submitListing}><label>Название<input required minLength={4} maxLength={70} placeholder="Например, палатка для походов" value={listingForm.title} onChange={(event) => setListingForm({ ...listingForm, title: event.target.value })} /></label><div className="form-row"><label>Категория<select value={listingForm.category} onChange={(event) => setListingForm({ ...listingForm, category: event.target.value as Category })}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label><label>Состояние<select value={listingForm.condition} onChange={(event) => setListingForm({ ...listingForm, condition: event.target.value as Condition })}><option>Новое</option><option>Отличное</option><option>Хорошее</option></select></label></div><label>Цена<input required type="number" min="1" max="10000000" placeholder="Цена в рублях" value={listingForm.price} onChange={(event) => setListingForm({ ...listingForm, price: event.target.value })} /></label><label>Описание<textarea required minLength={12} maxLength={500} rows={3} placeholder="Расскажи о состоянии, размере и особенностях" value={listingForm.description} onChange={(event) => setListingForm({ ...listingForm, description: event.target.value })} /></label><p className="demo-caption"><Icon name="shield" size={16} /> {apiStatus === 'connected' ? 'Объявление сохранится в PostgreSQL.' : 'Локальное демо: объявление видно только в этой сессии.'}</p><button className="button button-dark modal-submit" type="submit">Опубликовать <Icon name="arrow" size={17} /></button></form></section></div>}

      {modal === 'details' && selectedListing && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><section className="modal-card details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title"><button className="modal-close" aria-label="Закрыть" onClick={() => setModal(null)}><Icon name="close" /></button><img className="details-image" src={selectedListing.image} alt="" /><span className="modal-kicker">{selectedListing.category} · {selectedListing.condition.toLowerCase()}</span><h2 id="details-title">{selectedListing.title}</h2><div className="details-price">{money.format(selectedListing.price)} ₽</div><p>{selectedListing.description}</p><div className="details-seller"><span className="seller-avatar">{selectedListing.seller.slice(0, 1)}</span><span><strong>{selectedListing.seller}</strong><small><Icon name="pin" size={13} /> {selectedListing.location} · ★ {selectedListing.rating}</small></span><span className="seller-verified"><Icon name="check" size={15} /> на Тропе</span></div><button className="button button-dark modal-submit" onClick={() => { addToCart(selectedListing); setModal(null) }}>Добавить в корзину <Icon name="bag" size={18} /></button></section></div>}

      {modal === 'cart' && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><section className="modal-card cart-modal" role="dialog" aria-modal="true" aria-labelledby="cart-title"><button className="modal-close" aria-label="Закрыть" onClick={() => setModal(null)}><Icon name="close" /></button><span className="modal-kicker">ТВОЙ СЛЕДУЮЩИЙ МАРШРУТ</span><h2 id="cart-title">Корзина <span className="cart-total-count">{cart.length}</span></h2>{cart.length === 0 ? <div className="cart-empty"><span>↗</span><h3>Пока здесь пусто</h3><p>Добавь вещь, которая пригодится на маршруте.</p><button className="button button-dark modal-submit" onClick={() => { setModal(null); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }) }}>К каталогу <Icon name="arrow" size={17} /></button></div> : <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><strong>{item.title}</strong><small>{money.format(item.price)} ₽</small></div><button aria-label={`Удалить ${item.title}`} onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))}><Icon name="close" size={17} /></button></div>)}</div><div className="cart-summary"><span>Итого</span><strong>{money.format(cart.reduce((total, item) => total + item.price, 0))} ₽</strong></div><div className="demo-caption"><Icon name="shield" size={16} /> Демо-оформление: реальные деньги не списываются.</div><button className="button button-dark modal-submit" onClick={completeDemoOrder}>Оформить демо-заказ <Icon name="arrow" size={17} /></button></>}</section></div>}

      {modal === 'success' && <div className="modal-backdrop"><section className="modal-card success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title"><span className="success-icon"><Icon name="check" size={28} /></span><span className="modal-kicker">МАРШРУТ НАЧИНАЕТСЯ</span><h2 id="success-title">Демо-заказ оформлен</h2><p>{successMessage}</p><button className="button button-dark modal-submit" onClick={() => setModal(null)}>Продолжить <Icon name="arrow" size={17} /></button></section></div>}

      {toast && <div className="toast" role="status"><Icon name="check" size={17} /> {toast}</div>}
    </div>
  )
}

export default App
