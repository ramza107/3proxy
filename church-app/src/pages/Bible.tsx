import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'

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

type TestamentFilter = 'Усі' | 'Старий Завіт' | 'Новий Завіт'

function parseTestament(value: string | null): TestamentFilter {
  if (value === 'Старий Завіт' || value === 'Новий Завіт') return value
  return 'Усі'
}

export function Bible() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [index, setIndex] = useState<IndexData | null>(null)
  const [q, setQ] = useState('')
  const testament = parseTestament(searchParams.get('testament'))

  useEffect(() => {
    fetch(assetUrl('scripture/index.json'))
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

  const setTestament = (t: TestamentFilter) => {
    if (t === 'Усі') setSearchParams({})
    else setSearchParams({ testament: t })
  }

  return (
    <div className="page library-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="topbar">
          <Link className="icon-btn" to="/library" aria-label="До бібліотеки">
            ←
          </Link>
          <h1 className="section-title" style={{ margin: 0, fontSize: '1.7rem' }}>
            {testament === 'Усі' ? 'Біблія' : testament}
          </h1>
        </div>
        <p className="section-lead">
          {index ? `${index.translation} · ${books.length} книг` : 'Завантаження…'}
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
