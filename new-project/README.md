# Тропа — маркетплейс экипировки

Full-stack приложение для покупки и продажи спортивной и outdoor-экипировки. Клиент — React + TypeScript + Vite; API — Express + TypeScript; база — PostgreSQL с Prisma.

## Возможности

- Поиск по каталогу, категориям, состоянию и максимальной цене; серверная сортировка и пагинация.
- Регистрация и вход с JWT, аккаунты покупателей и продавцов.
- Создание объявлений продавцом и добавление товаров в избранное.
- Демо-оформление заказа для товаров из API. API сохраняет заказ с `paymentMode: "DEMO"`; реальные платежи не проводятся.
- У каталога есть локальный демо-набор: если API недоступен, интерфейс сообщает об этом и остаётся интерактивным.
- Адаптивная вёрстка, подробная карточка товара, корзина, загрузочные и пустые состояния.

## Локальный запуск

Нужны Node.js 20.19+ и npm. Для backend также нужен Docker.

1. Установи зависимости:

   ```sh
   npm install
   ```

2. Запусти PostgreSQL:

   ```sh
   docker compose up -d db
   ```

3. Скопируй `.env.example` в `.env` и замени `JWT_SECRET` на случайное значение длиной не менее 32 символов.
4. Создай таблицы и добавь демонстрационные объявления:

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

5. Запусти клиент и API:

   ```sh
   npm run dev
   ```

Клиент откроется на `http://localhost:5173`, API — на `http://localhost:3001`. Vite проксирует запросы `/api` в API; health check: `GET /api/health`.

Без PostgreSQL можно запустить только клиент командой `npm run dev:web`: каталог и основные действия будут работать на демонстрационных данных в памяти вкладки.

## Команды

```sh
npm run build       # типизация клиента и API, production-сборка клиента
npm run lint        # ESLint
npm test            # проверки API-клиента
npm run db:generate # генерация Prisma Client
npm run db:migrate  # создание/обновление миграций
npm run db:seed     # тестовые объявления
npm run dev:api     # только API
npm run dev:web     # только клиент
```

## API

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/listings?q=&category=&condition=&maxPrice=&sort=&page=&limit=`
- `GET /api/listings/:id`, `POST /api/listings`, `PATCH /api/listings/:id`, `DELETE /api/listings/:id`
- `GET /api/seller/listings`
- `GET /api/seller/orders`
- `GET /api/favorites`, `PUT /api/favorites/:listingId`, `DELETE /api/favorites/:listingId`
- `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/:id/status`, `POST /api/orders/:id/review`

Для защищённых маршрутов передавай `Authorization: Bearer <token>`. Новая регистрация продавца включает возможность публиковать объявления. Пароли хешируются перед сохранением. Демо-режим не подключает платёжный провайдер и не списывает деньги.

## Статус

Проект рассчитан на портфолио и локальный запуск; публичный production-деплой и проверка платёжных интеграций не настроены. Все секреты следует задавать через локальные переменные окружения, а не коммитить в репозиторий.
