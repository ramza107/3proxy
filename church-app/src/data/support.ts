export type SupportChannel = {
  id: 'app' | 'charity'
  title: string
  shortTitle: string
  badge: string
  description: string
  whereGoes: string
  notCharity: boolean
  amounts: number[]
  /** LiqPay / Fondy / банка — можна з плейсхолдером {amount} */
  paymentUrl: string
  recipientName?: string
}

/** Куди реально підуть гроші — замініть реквізити перед продакшеном */
export const supportChannels: Record<'app' | 'charity', SupportChannel> = {
  app: {
    id: 'app',
    title: 'Підтримати застосунок',
    shortTitle: 'Застосунок',
    badge: 'розвиток',
    description:
      'Добровільна підтримка автора й розвитку Благовіст: сервери, новий контент, оновлення.',
    whereGoes:
      'Кошти надходять як підтримка проєкту (дохід ФОП/автора). Їх можна витрачати на розвиток застосунку та особисті потреби автора після сплати податків.',
    notCharity: true,
    amounts: [50, 100, 200, 500],
    paymentUrl: '',
  },
  charity: {
    id: 'charity',
    title: 'Благодійність',
    shortTitle: 'Благодійність',
    badge: 'допомога',
    description:
      'Цільова допомога парафії / благодійному фонду: служіння, діти, соціальні ініціативи.',
    whereGoes:
      'Кошти йдуть на окремий благодійний рахунок парафії або фонду. Автор застосунку не забирає їх собі. Звітність — у отримувача допомоги.',
    notCharity: false,
    amounts: [100, 200, 500, 1000],
    paymentUrl: '',
    recipientName: 'Парафія / благодійний фонд (вкажіть назву)',
  },
}

export type SupportChannelId = keyof typeof supportChannels
