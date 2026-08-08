import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'

type FreeBook = {
  id: number
  title: string
  authors: string
  languages: string[]
  subjects: string[]
  downloadCount: number
  textUrl: string
  htmlUrl?: string | null
  epubUrl?: string | null
  source: string
  license: string
}

type Catalog = {
  title: string
  description: string
  attribution: string
  books: FreeBook[]
}

export function FreeBooks() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(assetUrl('free-books/catalog.json'))
      .then((r) => {
        if (!r.ok) throw new Error('fail')
        return r.json()
      })
      .then(setCatalog)
      .catch(() => setError('Не вдалося завантажити каталог'))
  }, [])

  const books = useMemo(() => {
    if (!catalog) return []
    const query = q.trim().toLowerCase()
    if (!query) return catalog.books
    return catalog.books.filter((b) => {
      const blob = `${b.title} ${b.authors} ${b.subjects.join(' ')}`.toLowerCase()
      return blob.includes(query)
    })
  }, [catalog, q])

  return (
    <div className="page library-page">
      <div className="topbar">
        <Link className="icon-btn" to="/library" aria-label="Назад">
          ←
        </Link>
        <h1 className="section-title" style={{ margin: 0, fontSize: '1.55rem' }}>
          Вільні книги
        </h1>
      </div>

      <p className="section-lead">
        {catalog
          ? `${catalog.books.length} безкоштовних християнських книг (public domain), доступних до читання й поширення.`
          : 'Завантаження каталогу…'}
      </p>

      <input
        className="search"
        placeholder="Пошук: Augustine, prayer, Bible…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Пошук книг"
      />

      {error && <p className="empty">{error}</p>}

      <div className="stack" style={{ marginTop: 14 }}>
        {books.slice(0, 200).map((book, i) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 20) * 0.02 }}
          >
            <Link className="tile free-book-tile" to={`/library/free-books/${book.id}`}>
              <strong>{book.title}</strong>
              <span>{book.authors}</span>
              <span className="free-book-meta">
                Project Gutenberg · #{book.id}
                {book.languages?.length ? ` · ${book.languages.join(', ')}` : ''}
              </span>
            </Link>
          </motion.div>
        ))}
        {catalog && !books.length && <p className="empty">Нічого не знайдено</p>}
      </div>

      {catalog && (
        <p className="section-lead" style={{ marginTop: 16, fontSize: '0.78rem' }}>
          {catalog.attribution}
        </p>
      )}
    </div>
  )
}
