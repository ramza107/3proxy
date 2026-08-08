import { useState } from 'react'
import { motion } from 'framer-motion'
import { projectSupport } from '../data/support'

export function Support() {
  const [amount, setAmount] = useState(projectSupport.amounts[1] ?? 100)
  const [toast, setToast] = useState('')

  const pay = () => {
    if (projectSupport.paymentUrl) {
      const url = projectSupport.paymentUrl.includes('{amount}')
        ? projectSupport.paymentUrl.replace('{amount}', String(amount))
        : projectSupport.paymentUrl
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    setToast(`Дякуємо! ${amount} ₴ на підтримку проєкту (демо).`)
    window.setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="page">
      <h1 className="section-title">Підтримка</h1>
      <p className="section-lead">{projectSupport.description}</p>

      <article className="tile tile-accent">
        <strong>{projectSupport.title}</strong>
        <div className="chip-row" style={{ marginTop: 14, marginBottom: 12 }}>
          {projectSupport.amounts.map((value) => (
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
        <button type="button" className="btn btn-primary support-pay" onClick={pay}>
          Підтримати на {amount} ₴
        </button>
      </article>

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
