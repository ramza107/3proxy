import { motion } from 'framer-motion'
import { stations } from '../data/radio'
import { useRadioPlayer } from '../context/RadioPlayerContext'

const kindLabel = {
  загальне: 'Загальне',
  діти: 'Дітям',
  музика: 'Музика',
  літургія: 'Літургія',
} as const

export function Radio() {
  const { station, playing, loading, error, play, toggle } = useRadioPlayer()

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="section-title">Радіо</h1>
        <p className="section-lead">Безкоштовні церковні й християнські ефіри — слухайте просто в застосунку.</p>
      </motion.div>

      {station && (
        <article className="tile tile-accent now-playing">
          <span className="badge">Зараз</span>
          <strong style={{ display: 'block', marginTop: 8, fontSize: '1.2rem' }}>{station.name}</strong>
          <p>{loading ? 'Підключення до ефіру…' : playing ? 'Відтворення…' : 'На паузі'}</p>
          <div className="cta-row">
            <button type="button" className="btn btn-primary" onClick={toggle}>
              {playing ? 'Пауза' : 'Продовжити'}
            </button>
            <a className="btn btn-outline" href={station.website} target="_blank" rel="noreferrer">
              Сайт станції
            </a>
          </div>
        </article>
      )}

      {error && (
        <p className="tile" style={{ color: 'var(--rose)', marginTop: 12 }}>
          {error}
        </p>
      )}

      <div className="stack" style={{ marginTop: 14 }}>
        {stations.map((s, i) => {
          const active = station?.id === s.id
          return (
            <motion.article
              key={s.id}
              className={`tile radio-station${active ? ' active' : ''}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{s.name}</strong>
                <span className="badge">{kindLabel[s.kind]}</span>
              </div>
              <span>{s.subtitle}</span>
              <div className="cta-row">
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => {
                    if (active) toggle()
                    else play(s)
                  }}
                >
                  {active && playing ? 'Пауза' : active && loading ? '…' : 'Слухати'}
                </button>
                <a className="btn btn-outline" href={s.website} target="_blank" rel="noreferrer">
                  Деталі
                </a>
              </div>
            </motion.article>
          )
        })}
      </div>

      <p className="section-lead" style={{ marginTop: 18, fontSize: '0.8rem' }}>
        Потоки належать відповідним радіостанціям і доступні безкоштовно. Підтримати їх можна на офіційних сайтах.
      </p>
    </div>
  )
}
