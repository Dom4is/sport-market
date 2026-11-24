import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const listings = [
  {
    slug: 'msr-hubba-hubba-nx',
    title: 'Палатка MSR Hubba Hubba NX',
    description: 'Лёгкая двухместная палатка для треккинга. Использовалась в трёх походах, без повреждений. В комплекте дуги, колышки и чехол.',
    category: 'Туризм',
    condition: 'Отличное',
    price: 32900,
    imageUrl: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=900&q=85',
    location: 'Москва',
  },
  {
    slug: 'specialized-diverge-gravel',
    title: 'Велосипед gravel Specialized Diverge',
    description: 'Gravel-велосипед для длинных маршрутов и грунтовых дорог. Размер рамы 54, Shimano GRX, обслужен в этом сезоне.',
    category: 'Велоспорт',
    condition: 'Хорошее',
    price: 118000,
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=85',
    location: 'Санкт-Петербург',
  },
  {
    slug: 'patagonia-torrentshell-3l',
    title: 'Куртка Patagonia Torrentshell 3L',
    description: 'Трёхслойная мембранная куртка, размер M. Мембрана в отличном состоянии, молнии и проклейка швов проверены.',
    category: 'Одежда',
    condition: 'Отличное',
    price: 14900,
    imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=900&q=85',
    location: 'Казань',
  },
  {
    slug: 'osprey-atmos-ag-65',
    title: 'Рюкзак Osprey Atmos AG 65',
    description: 'Вместительный рюкзак для автономных походов. Объём 65 л, размер L/XL. Есть небольшие следы использования, все пряжки целы.',
    category: 'Туризм',
    condition: 'Хорошее',
    price: 21400,
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=85',
    location: 'Екатеринбург',
  },
  {
    slug: 'salomon-qst-92',
    title: 'Лыжи Salomon QST 92 + крепления',
    description: 'Универсальные лыжи длиной 176 см с креплениями Warden. Канты ровные, скользяк подготовлен к сезону.',
    category: 'Зимний спорт',
    condition: 'Хорошее',
    price: 46500,
    imageUrl: 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?auto=format&fit=crop&w=900&q=85',
    location: 'Новосибирск',
  },
  {
    slug: 'oneill-surf-wetsuit',
    title: 'Гидрокостюм для серфинга O’Neill',
    description: 'Гидрокостюм толщиной 3/2 мм, размер M. Куплен в подарок, ни разу не надевался.',
    category: 'Водный спорт',
    condition: 'Новое',
    price: 18900,
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=85',
    location: 'Сочи',
  },
]

async function main() {
  const seller = await prisma.user.upsert({
    where: { email: 'seed-seller@tropa.local' },
    update: {},
    create: {
      email: 'seed-seller@tropa.local',
      name: 'Команда Тропы',
      passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
      role: 'SELLER',
    },
  })

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { slug: listing.slug },
      update: { ...listing, sellerId: seller.id },
      create: { ...listing, sellerId: seller.id },
    })
  }

  console.log(`Seeded ${listings.length} listings.`)
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
