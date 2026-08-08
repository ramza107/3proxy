import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supportChannels, type SupportChannelId } from '../data/support'

export function Support() {
  const [channelId, setChannelId] = useState<SupportChannelId>('app')
  const [amount, setAmount] = useState(100)
  const [custom, setCustom] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [toast, setToast] = useState('')

  const channel = supportChannels[channelId]
  const payAmount = useMemo(() => {
    const n = Number(custom)
    if (custom.trim() && Number.isFinite(n) && n > 0) return Math.round(n)
    return amount
  }, [amount, custom])

  const submit = () => {
    if (!confirmed) {
      setToast('Спочатку підтвердіть, що розумієте, куди підуть кошти.')
      window.setTimeout(() => setToast(''), 2800)
      return
    }
    if (payAmount < 10) {
      setToast('Мінімальна сума — 10 ₴.')
      window.setTimeout(() => setToast(''), 2800)
      return
    }

    if (channel.paymentUrl) {
      const url = channel.paymentUrl.includes('{amount}')
        ? channel.paymentUrl.replace('{amount}', String(payAmount))
        : channel.paymentUrl
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    setToast(
      channel.notCharity
        ? `Дякуємо! ${payAmount} ₴ — підтримка застосунку (демо). Підключіть LiqPay на ФОП.`
        : `Дякуємо! ${payAmount} ₴ — благодійність (демо). Додайте посилання на банку парафії/фонду.`,
    )
    window.setTimeout(() => setToast(''), 3600)
  }

  return (
    <div className="page">
      <h1 className="section-title">Підтримка</h1>
      <p className="section-lead">Дві окремі кнопки — різні цілі. Оберіть свідомо.</p>

      <div className="support-switch" role="tablist" aria-label="Тип підтримки">
        {(Object.keys(supportChannels) as SupportChannelId[]).map((id) => {
          const item = supportChannels[id]
          const active = channelId === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`support-switch-btn${active ? ' active' : ''}${item.notCharity ? '' : ' charity'}`}
              onClick={() => {
                setChannelId(id)
                setAmount(item.amounts[1] ?? item.amounts[0])
                setCustom('')
                setConfirmed(false)
              }}
            >
              {item.shortTitle}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.article
          key={channel.id}
          className={`tile support-card${channel.notCharity ? '' : ' support-card-charity'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          <span className={`badge${channel.notCharity ? ' premium' : ''}`}>{channel.badge}</span>
          <h2 className="section-title" style={{ fontSize: '1.55rem', marginTop: 10 }}>
            {channel.title}
          </h2>
          <p className="section-lead" style={{ marginBottom: 12 }}>
            {channel.description}
          </p>

          <div className="support-note">
            <strong>Куди йдуть кошти</strong>
            <p>{channel.whereGoes}</p>
            {!channel.notCharity && (
              <p className="support-recipient">Отримувач: {supportChannels.charity.recipientName}</p>
            )}
          </div>

          <p className="support-amount-label">Сума</p>
          <div className="chip-row" style={{ marginBottom: 10 }}>
            {channel.amounts.map((value) => (
              <button
                key={value}
                type="button"
                className={`chip${!custom && amount === value ? ' active' : ''}`}
                onClick={() => {
                  setAmount(value)
                  setCustom('')
                }}
              >
                {value} ₴
              </button>
            ))}
          </div>
          <input
            className="search"
            inputMode="numeric"
            placeholder="Своя сума, ₴"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
            aria-label="Своя сума"
          />

          <label className="support-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              Я розумію: це{' '}
              <strong>{channel.notCharity ? 'підтримка застосунку (не благодійність)' : 'благодійний внесок'}</strong>
              {channel.notCharity
                ? ', кошти отримує автор проєкту.'
                : ', кошти йдуть отримувачу допомоги, не автору застосунку.'}
            </span>
          </label>

          <button className="btn btn-primary support-pay" type="button" onClick={submit}>
            {channel.notCharity ? `Підтримати на ${payAmount} ₴` : `Пожертвувати ${payAmount} ₴`}
          </button>
        </motion.article>
      </AnimatePresence>

      <div className="stack" style={{ marginTop: 16 }}>
        <article className="tile">
          <strong>Чому два варіанти?</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
            Так чесніше перед людьми: підтримка автора й цільова допомога не змішуються на одному рахунку.
          </p>
        </article>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="tile support-toast"
        >
          {toast}
        </motion.div>
      )}
    </div>
  )
}
