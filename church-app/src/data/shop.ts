import { brand } from '../brand'

export type Product = {
  id: string
  title: string
  subtitle: string
  priceUah: number
  tag: 'курс' | 'книга' | 'підписка' | 'пожертва'
  premium?: boolean
  /** id курсу в public/courses */
  courseId?: string
}

export const products: Product[] = [
  {
    id: 'kids-premium',
    title: 'Дитяча Академія Віри',
    subtitle: '30 днів: історії, практика й квізи для дітей',
    priceUah: 349,
    tag: 'курс',
    premium: true,
    courseId: 'kids-bible-30',
  },
  {
    id: 'prayer-course',
    title: '30 днів молитви',
    subtitle: 'Щоденне правило: Писання, роздум, молитва',
    priceUah: 249,
    tag: 'курс',
    premium: true,
    courseId: 'prayer-30',
  },
  {
    id: 'family-course',
    title: 'Християнська родина: 30 днів',
    subtitle: 'Практики для батьків і дітей на кожен день',
    priceUah: 299,
    tag: 'курс',
    premium: true,
    courseId: 'family-30',
  },
  {
    id: 'lent-course',
    title: 'Великий піст: 40 днів',
    subtitle: 'Щоденні роздуми, стриманість і милосердя до Пасхи',
    priceUah: 229,
    tag: 'курс',
    premium: true,
    courseId: 'lent-40',
  },
  {
    id: 'mark-course',
    title: 'Євангеліє від Марка за 28 днів',
    subtitle: 'Системне читання Євангелія з коротким роздумом',
    priceUah: 199,
    tag: 'курс',
    premium: true,
    courseId: 'mark-28',
  },
  {
    id: 'family-sub',
    title: `Сімейна підписка ${brand.plus}`,
    subtitle: 'Усі курси, радіо без реклами, сімейний прогрес',
    priceUah: 149,
    tag: 'підписка',
    premium: true,
  },
  {
    id: 'prayer-book',
    title: 'Молитовник родини',
    subtitle: 'Електронна книга з ранковими й вечірніми молитвами',
    priceUah: 99,
    tag: 'книга',
  },
]

export const plans = [
  {
    id: 'free',
    name: 'Безкоштовно',
    price: '0 ₴',
    perks: ['Повна Біблія українською', 'Церковний календар', 'Безкоштовні дитячі уроки', '3 дні превʼю кожного курсу'],
  },
  {
    id: 'plus',
    name: brand.plus,
    price: '149 ₴/міс',
    perks: ['Усі місячні курси', 'Радіо без реклами в застосунку', 'Аудіо та офлайн-читання', 'Сімейний прогрес'],
  },
]
