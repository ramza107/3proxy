export type SupportChannel = {
  id: 'dev' | 'kids'
  title: string
  description: string
  amounts: number[]
  /** LiqPay / Fondy / банка — можна {amount} */
  paymentUrl: string
}

export const supportChannels: Record<'dev' | 'kids', SupportChannel> = {
  dev: {
    id: 'dev',
    title: 'Підтримка розробки',
    description: 'На розвиток застосунку: сервери, оновлення, новий контент.',
    amounts: [50, 100, 200],
    paymentUrl: '',
  },
  kids: {
    id: 'kids',
    title: 'Допомога дитячим будинкам',
    description: 'Цільова допомога дітям. Кошти йдуть на благодійний рахунок, не автору застосунку.',
    amounts: [100, 200, 500],
    paymentUrl: '',
  },
}

export type SupportChannelId = keyof typeof supportChannels
