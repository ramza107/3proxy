export type Feast = {
  id: string
  date: string // YYYY-MM-DD
  title: string
  type: 'велике' | 'середнє' | 'памʼять' | 'піст'
  description: string
}

/** Церковний календар (ПЦУ / новий стиль для нерухомих свят + ключові дати 2026) */
export const feasts2026: Feast[] = [
  {
    id: 'theophany',
    date: '2026-01-06',
    title: 'Богоявлення / Хрещення Господнє',
    type: 'велике',
    description: 'Велике свято. Освячення води, спогад Хрещення Христа в Йордані.',
  },
  {
    id: 'meeting',
    date: '2026-02-15',
    title: 'Стрітення Господнє',
    type: 'велике',
    description: 'Принесення Ісуса до храму. День зустрічі Старого і Нового Завіту.',
  },
  {
    id: 'annunciation',
    date: '2026-04-07',
    title: 'Благовіщення Пресвятої Богородиці',
    type: 'велике',
    description: 'Архангел Гавриїл сповіщає Марії про народження Спасителя.',
  },
  {
    id: 'palm',
    date: '2026-04-05',
    title: 'Вербна неділя',
    type: 'велике',
    description: 'Вхід Господній у Єрусалим. Початок Страсного тижня.',
  },
  {
    id: 'easter',
    date: '2026-04-12',
    title: 'Пасха — Воскресіння Христове',
    type: 'велике',
    description: 'Свято свят. Христос воскрес! Світла седмиця.',
  },
  {
    id: 'ascension',
    date: '2026-05-21',
    title: 'Вознесіння Господнє',
    type: 'велике',
    description: '40-й день після Пасхи. Вознесіння Христа на небо.',
  },
  {
    id: 'pentecost',
    date: '2026-05-31',
    title: 'Зіслання Святого Духа (Трійця)',
    type: 'велике',
    description: 'День народження Церкви. Зелені свята.',
  },
  {
    id: 'transfiguration',
    date: '2026-08-19',
    title: 'Преображення Господнє (Яблучний Спас)',
    type: 'велике',
    description: 'Преображення на Фаворі. Освячення плодів.',
  },
  {
    id: 'dormition',
    date: '2026-08-28',
    title: 'Успіння Пресвятої Богородиці',
    type: 'велике',
    description: 'Велике богородичне свято. Завершення Успенського посту.',
  },
  {
    id: 'nativity-theotokos',
    date: '2026-09-21',
    title: 'Різдво Пресвятої Богородиці',
    type: 'велике',
    description: 'Народження Діви Марії — початок історії спасіння.',
  },
  {
    id: 'exaltation',
    date: '2026-09-27',
    title: 'Воздвиження Хреста Господнього',
    type: 'велике',
    description: 'Вшанування Хреста. День строгого посту.',
  },
  {
    id: 'pokrova',
    date: '2026-10-14',
    title: 'Покрова Пресвятої Богородиці',
    type: 'середнє',
    description: 'Особливе свято для України — захист і заступництво Богородиці.',
  },
  {
    id: 'st-nicholas',
    date: '2026-12-19',
    title: 'Святитель Миколай Чудотворець',
    type: 'середнє',
    description: 'День святого Миколая — милосердя, дари, турбота про дітей.',
  },
  {
    id: 'nativity',
    date: '2026-12-25',
    title: 'Різдво Христове',
    type: 'велике',
    description: 'Народження Ісуса Христа (календар ПЦУ — 25 грудня).',
  },
  {
    id: 'philip-fast-start',
    date: '2026-11-28',
    title: 'Початок Різдвяного посту',
    type: 'піст',
    description: 'Пилипівка — підготовка серця до зустрічі Христа.',
  },
  {
    id: 'great-lent-start',
    date: '2026-02-23',
    title: 'Початок Великого посту',
    type: 'піст',
    description: 'Чистий понеділок. Час покаяння і молитви перед Пасхою.',
  },
]

export function getMonthFeasts(year: number, monthIndex: number): Feast[] {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  return feasts2026
    .filter((f) => f.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getUpcoming(from = new Date(), limit = 5): Feast[] {
  const today = from.toISOString().slice(0, 10)
  return feasts2026
    .filter((f) => f.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}
