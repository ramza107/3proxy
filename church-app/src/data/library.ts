export type LibraryCategory = {
  id: string
  title: string
  kind: 'bible-ot' | 'bible-nt' | 'bible-psa' | 'texts'
  icon: 'tablets' | 'cross' | 'angel' | 'saint' | 'lyre' | 'beads' | 'book' | 'quill'
}

export type LibraryText = {
  id: string
  categoryId: string
  title: string
  subtitle?: string
  body: string[]
}

export const libraryCategories: LibraryCategory[] = [
  { id: 'ot', title: 'Старий Завіт', kind: 'bible-ot', icon: 'tablets' },
  { id: 'nt', title: 'Новий Завіт', kind: 'bible-nt', icon: 'cross' },
  { id: 'akathists', title: 'Акафісти', kind: 'texts', icon: 'angel' },
  { id: 'canons', title: 'Канони', kind: 'texts', icon: 'saint' },
  { id: 'psalter', title: 'Псалтир', kind: 'bible-psa', icon: 'lyre' },
  { id: 'prayerbook', title: 'Молитвослов', kind: 'texts', icon: 'beads' },
  { id: 'liturgical', title: 'Богослужбові книги', kind: 'texts', icon: 'book' },
  { id: 'spiritual', title: 'Духовна література', kind: 'texts', icon: 'quill' },
]

/** Короткі демо-тексти; повні збірки можна підключити пізніше з ліцензією */
export const libraryTexts: LibraryText[] = [
  {
    id: 'akathist-jesus',
    categoryId: 'akathists',
    title: 'Акафіст до Ісуса Найсолодшого',
    subtitle: 'Уривок',
    body: [
      'Кондак 1. Обраний Воєводо і Господи, переможцю ада, яко избавився єси від вічної смерти, восспівую Тя, раба Твого, але яко милосердний Ісусе, свободи мене від усякої біди, зовучи: Ісусе, Сину Божий, помилуй мене.',
      'Ікос 1. Ангел представник з неба посланий був сказати Богородиці: Радуйся, і з безтілесним голосом воплочуваного Тебе зря, Господи, жахався і стояв, взиваючи до Неї такія:',
    ],
  },
  {
    id: 'akathist-theotokos',
    categoryId: 'akathists',
    title: 'Акафіст до Пресвятої Богородиці',
    subtitle: 'Уривок',
    body: [
      'Кондак 1. Взбранній Воєводі переможная, яко избавившися від злих, благодарственная восписуєм Ти раби Твої, Богородице, але яко імущая державу непереможну, від всяких нас бід свободи, хай зовем Ти: Радуйся, Невісто Неневісная.',
    ],
  },
  {
    id: 'canon-repentance',
    categoryId: 'canons',
    title: 'Канон покаянний',
    subtitle: 'Уривок',
    body: [
      'Пісня 1. Ірмос: Яко по суху пішоходив Ізраїль по безодні стопами, гонителя фараона видя потопляєма, Богу переможную пісню співаємо, взиваючи.',
      'Приспів: Помилуй мене, Боже, помилуй мене. Нині приступих аз грішний і обтяжений до Тебе, Владико і Бога мого.',
    ],
  },
  {
    id: 'morning-prayers',
    categoryId: 'prayerbook',
    title: 'Ранкові молитви',
    body: [
      'Во імʼя Отця, і Сина, і Святого Духа. Амінь.',
      'Боже, милостивий будь мені, грішному.',
      'Отче наш, що єси на небесах, нехай святиться імʼя Твоє, нехай прийде царство Твоє, нехай буде воля Твоя як на небі, так і на землі. Хліб наш насущний дай нам сьогодні, і прости нам провини наші, як і ми прощаємо винуватцям нашим, і не введи нас у спокусу, але визволи нас від лукавого.',
    ],
  },
  {
    id: 'evening-prayers',
    categoryId: 'prayerbook',
    title: 'Вечірні молитви',
    body: [
      'Царю Небесний, Утішителю, Душе істини, що всюди єси і все наповняєш, скарбе дібр і життя Подателю, прийди і вселися в нас, і очисти нас від усякої скверни, і спаси, Благий, душі наші.',
      'Достойне єсть яко воістину блажити Тя, Богородицю, Присноблаженну і Пренепорочну і Матір Бога нашого.',
    ],
  },
  {
    id: 'hours-excerpt',
    categoryId: 'liturgical',
    title: 'Часи (уривок)',
    subtitle: 'Богослужбовий текст',
    body: [
      'Прийдіте, поклонімся Цареві нашому Богу.',
      'Прийдіте, поклонімся і припадім Христу, Цареві нашому Богу.',
      'Прийдіте, поклонімся і припадім Самому Христу, Цареві і Богу нашому.',
    ],
  },
  {
    id: 'spiritual-peace',
    categoryId: 'spiritual',
    title: 'Про мир у серці',
    subtitle: 'Коротке читання',
    body: [
      'Мир Христовий не залежить від зовнішніх обставин. Він народжується там, де людина віддає тривогу Богові і вчиться дякувати.',
      'Кожного дня обирай мале добро: молитву, стриманість у слові, увагу до ближнього. Так душа звикає до світла.',
    ],
  },
  {
    id: 'spiritual-mercy',
    categoryId: 'spiritual',
    title: 'Про милосердя',
    subtitle: 'Коротке читання',
    body: [
      'Милосердя — це не слабкість, а сила любові. Хто прощає, той звільняє і себе.',
      'Почни з малого: тепла відповідь, тиха допомога, молитва за того, хто важкий для тебе.',
    ],
  },
]

export function textsForCategory(categoryId: string): LibraryText[] {
  return libraryTexts.filter((t) => t.categoryId === categoryId)
}

export function getLibraryText(id: string): LibraryText | undefined {
  return libraryTexts.find((t) => t.id === id)
}

export function getCategory(id: string): LibraryCategory | undefined {
  return libraryCategories.find((c) => c.id === id)
}
