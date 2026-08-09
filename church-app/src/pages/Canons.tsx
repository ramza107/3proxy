import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'

type CanonItem = {
  id: string
  title: string
  category: 'canon' | 'rule' | 'prayer' | string
  source: string
  sourceUrl: string
  language?: string
  chars: number
}

type Catalog = {
  title: string
  description: string
  attribution: string
  items: CanonItem[]
}

const CATEGORY_LABEL: Record<string, string> = {
  canon: 'Канон',
  rule: 'Правило',
  prayer: 'Молитва',
}

export function Canons() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'canon' | 'rule' | 'prayer'>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(assetUrl('canons/index.json'))
      .then((r) => {
        if (!r.ok) throw new Error('fail')
        return r.json()
      })
      .then(setCatalog)
      .catch(() => setError('Не вдалося завантажити каталог канонів'))
  }, [])

  const items = useMemo(() => {
    if (!catalog) return []
    const query = q.trim().toLowerCase()
    return catalog.items.filter((item) => {
      if (filter !== 'all' && item.category !== filter) return false
      if (!query) return true
      return item.title.toLowerCase().includes(query)
    })
  }, [catalog, q, filter])

  return (
    <div className="page library-page">
      <div className="topbar">
        <Link className="icon-btn" to="/library" aria-label="Назад">
          ←
        </Link>
        <h1 className="section-title" style={{ margin: 0, fontSize: '1.55rem' }}>
          Канони
        </h1>
      </div>

      <p className="section-lead">
        {catalog
          ? `${catalog.items.length} повних текстів: канони, правило до Причастя, ранкові й вечірні молитви.`
          : 'Завантаження каталогу…'}
      </p>

      <input
        className="search"
        placeholder="Пошук: покаянний, Богородиці, Миколай…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Пошук канонів"
      />

      <div className="canon-filters" role="tablist" aria-label="Фільтр">
        {(
          [
            ['all', 'Усі'],
            ['canon', 'Канони'],
            ['rule', 'Правила'],
            ['prayer', 'Молитви'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`canon-filter${filter === id ? ' is-active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="empty">{error}</p>}

      <div className="stack" style={{ marginTop: 14 }}>
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 20) * 0.02 }}
          >
            <Link className="tile free-book-tile" to={`/library/canons/${item.id}`}>
              <strong>{item.title}</strong>
              <span className="free-book-meta">
                {CATEGORY_LABEL[item.category] ?? item.category}
                {item.language === 'uk-translit' || item.language === 'translit'
                  ? ' · транслітерація'
                  : ' · українською'}
                {item.chars ? ` · ${Math.round(item.chars / 1000)} тис. знаків` : ''}
              </span>
            </Link>
          </motion.div>
        ))}
        {catalog && !items.length && <p className="empty">Нічого не знайдено</p>}
      </div>

      {catalog && (
        <p className="section-lead" style={{ marginTop: 16, fontSize: '0.78rem' }}>
          {catalog.attribution}
        </p>
      )}
    </div>
  )
}
