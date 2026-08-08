export type Product = {
  id: string
  title: string
  subtitle: string
  priceUah: number
  tag: 'курс' | 'книга' | 'підписка' | 'пожертва'
  premium?: boolean
}

export const products: Product[] = [
  {
    id: 'kids-premium',
    title: 'Дитяча Академія Віри',
    subtitle: '30 уроків, квізи, сертифікат для дитини',
    priceUah: 349,
    tag: 'курс',
    premium: true,
  },
  {
    id: 'family-sub',
    title: 'Сімейна підписка Світло+',
    subtitle: 'Календар, аудіо-Біблія, нові уроки щотижня',
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
  {
    id: 'lent-course',
    title: 'Великий піст: 40 днів',
    subtitle: 'Щоденні роздуми, пости й практика милосердя',
    priceUah: 229,
    tag: 'курс',
  },
  {
    id: 'donate-temple',
    title: 'Пожертва на парафію',
    subtitle: 'Підтримайте служіння, дітей і соціальні ініціативи',
    priceUah: 100,
    tag: 'пожертва',
  },
]

export const plans = [
  {
    id: 'free',
    name: 'Безкоштовно',
    price: '0 ₴',
    perks: ['Повна Біблія українською', 'Церковний календар', '3 дитячі уроки'],
  },
  {
    id: 'plus',
    name: 'Світло+',
    price: '149 ₴/міс',
    perks: ['Усі дитячі курси', 'Аудіо та офлайн-читання', 'Сімейний прогрес'],
  },
]
