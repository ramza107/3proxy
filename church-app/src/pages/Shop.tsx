import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { brand } from '../brand'
import { plans, products } from '../data/shop'

export function Shop() {
  const [toast, setToast] = useState('')

  const buy = (title: string) => {
    setToast(`«${title}» додано до демо-кошика. Оплату підключимо пізніше (LiqPay / Stripe).`)
    window.setTimeout(() => setToast(''), 3200)
  }

  return (
    <div className="page">
      <h1 className="section-title">Крамниця</h1>
      <p className="section-lead">Курси, підписка та окрема сторінка підтримки.</p>

      <div className="stack" style={{ marginBottom: 18 }}>
        <Link className="tile tile-accent support-entry" to="/support">
          <strong>Підтримка</strong>
          <span>Підтримка розробки або допомога дитячим будинкам.</span>
          <span className="support-entry-cta">Відкрити →</span>
        </Link>
      </div>

      <div className="stack">
        {plans.map((plan) => (
          <article key={plan.id} className={`tile${plan.id === 'plus' ? ' tile-accent' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong>{plan.name}</strong>
              <span className="price">{plan.price}</span>
            </div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--muted)' }}>
              {plan.perks.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {plan.id === 'plus' && (
              <button
                className="btn btn-primary"
                type="button"
                style={{ marginTop: 12, width: 'fit-content' }}
                onClick={() => buy(plan.name)}
              >
                Оформити {brand.plus}
              </button>
            )}
          </article>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: 28, fontSize: '1.6rem' }}>
        Пропозиції
      </h2>
      <div className="stack" style={{ marginTop: 12 }}>
        {products.map((p, i) => (
          <motion.article
            key={p.id}
            className="tile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong>{p.title}</strong>
              <span className="price">{p.priceUah} ₴</span>
            </div>
            <span>{p.subtitle}</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <span className={`badge${p.premium ? ' premium' : ''}`}>{p.tag}</span>
              <button className="btn btn-dark" type="button" onClick={() => buy(p.title)}>
                Купити
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="tile"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(var(--nav-h) + 18px)',
            width: 'min(480px, calc(100% - 28px))',
            zIndex: 30,
            background: 'var(--ink)',
            color: '#f8f4ea',
          }}
        >
          {toast}
        </motion.div>
      )}
    </div>
  )
}
