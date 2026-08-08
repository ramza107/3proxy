import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

type BookMeta = {
  id: string
  name: string
  testament: string
  chapterCount: number
  verseCount: number
}

type IndexData = {
  translation: string
  attribution: string
  books: BookMeta[]
}

export function Bible() {
  const [index, setIndex] = useState<IndexData | null>(null)
  const [q, setQ] = useState('')
  const [testament, setTestament] = useState<'Усі' | 'Старий Завіт' | 'Новий Завіт'>('Усі')

  useEffect(() => {
    fetch('/bible/index.json')
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex(null))
  }, [])

  const books = useMemo(() => {
    if (!index) return []
    return index.books.filter((b) => {
      const okT = testament === 'Усі' || b.testament === testament
      const okQ = !q.trim() || b.name.toLowerCase().includes(q.trim().toLowerCase())
      return okT && okQ
    })
  }, [index, q, testament])

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="section-title">Біблія</h1>
        <p className="section-lead">
          {index ? `${index.translation} · ${index.books.length} книг` : 'Завантаження…'}
        </p>
        <input
          className="search"
          placeholder="Пошук книги…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Пошук книги"
        />
        <div className="chip-row" style={{ marginTop: 12 }}>
          {(['Усі', 'Старий Завіт', 'Новий Завіт'] as const).map((t) => (
            <button
              key={t}
              className={`chip${testament === t ? ' active' : ''}`}
              onClick={() => setTestament(t)}
              type="button"
            >
              {t}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="stack">
        {books.map((book, i) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.03 }}
          >
            <Link className="tile" to={`/bible/${book.id}/1`}>
              <strong>{book.name}</strong>
              <span>
                {book.testament} · {book.chapterCount} р. · {book.verseCount} віршів
              </span>
            </Link>
          </motion.div>
        ))}
        {!books.length && <p className="empty">Нічого не знайдено</p>}
      </div>

      {index && (
        <p className="section-lead" style={{ marginTop: 18, fontSize: '0.8rem' }}>
          {index.attribution}
        </p>
      )}
    </div>
  )
}
