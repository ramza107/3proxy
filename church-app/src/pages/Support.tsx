import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { supportChannels, type SupportChannelId } from '../data/support'

export function Support() {
  const [active, setActive] = useState<SupportChannelId | null>(null)
  const [amount, setAmount] = useState(100)
  const [toast, setToast] = useState('')

  const channel = active ? supportChannels[active] : null
  const amounts = useMemo(() => channel?.amounts ?? [], [channel])

  const pay = (id: SupportChannelId, value: number) => {
    const item = supportChannels[id]
    if (item.paymentUrl) {
      const url = item.paymentUrl.includes('{amount}')
        ? item.paymentUrl.replace('{amount}', String(value))
        : item.paymentUrl
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    setToast(
      id === 'dev'
        ? `Дякуємо! ${value} ₴ на підтримку розробки (демо).`
        : `Дякуємо! ${value} ₴ на допомогу дитячим будинкам (демо).`,
    )
    window.setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="page">
      <h1 className="section-title">Підтримка</h1>
      <p className="section-lead">Оберіть, куди направити допомогу.</p>

      <div className="stack">
        <button
          type="button"
          className={`tile tile-accent support-simple-btn${active === 'dev' ? ' is-open' : ''}`}
          onClick={() => {
            setActive((v) => (v === 'dev' ? null : 'dev'))
            setAmount(supportChannels.dev.amounts[1] ?? 50)
          }}
        >
          <strong>{supportChannels.dev.title}</strong>
          <span>{supportChannels.dev.description}</span>
        </button>

        <button
          type="button"
          className={`tile support-simple-btn support-simple-kids${active === 'kids' ? ' is-open' : ''}`}
          onClick={() => {
            setActive((v) => (v === 'kids' ? null : 'kids'))
            setAmount(supportChannels.kids.amounts[1] ?? 100)
          }}
        >
          <strong>{supportChannels.kids.title}</strong>
          <span>{supportChannels.kids.description}</span>
        </button>
      </div>

      {channel && (
        <motion.div
          className="tile support-amount-box"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="support-amount-label">Сума для «{channel.title}»</p>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {amounts.map((value) => (
              <button
                key={value}
                type="button"
                className={`chip${amount === value ? ' active' : ''}`}
                onClick={() => setAmount(value)}
              >
                {value} ₴
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary support-pay"
            onClick={() => pay(channel.id, amount)}
          >
            Надіслати {amount} ₴
          </button>
        </motion.div>
      )}

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="tile support-toast"
        >
          {toast}
        </motion.div>
      )}
    </div>
  )
}
