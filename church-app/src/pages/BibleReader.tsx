import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'

type Verse = { n: string; t: string }
type Book = {
  id: string
  name: string
  testament: string
  chapters: Record<string, Verse[]>
}

export function BibleReader() {
  const { bookId = 'jhn', chapter = '1' } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [error, setError] = useState('')
  const ch = Number(chapter) || 1

  useEffect(() => {
    setBook(null)
    setError('')
    fetch(assetUrl(`scripture/${bookId}.json`))
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(setBook)
      .catch(() => setError('Не вдалося завантажити книгу'))
  }, [bookId])

  const chapterCount = useMemo(
    () => (book ? Object.keys(book.chapters).length : 0),
    [book],
  )
  const verses = book?.chapters[String(ch)] ?? []

  const go = (next: number) => {
    if (!book || next < 1 || next > chapterCount) return
    navigate(`/bible/${book.id}/${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page">
      <div className="topbar">
        <Link className="icon-btn" to="/library" aria-label="До бібліотеки">
          ←
        </Link>
        <div style={{ flex: 1 }}>
          <h1 className="section-title" style={{ margin: 0, fontSize: '1.55rem' }}>
            {book?.name ?? '…'}
          </h1>
          <p className="section-lead" style={{ margin: 0 }}>
            Розділ {ch}
            {chapterCount ? ` з ${chapterCount}` : ''}
          </p>
        </div>
      </div>

      {chapterCount > 0 && (
        <div className="chip-row">
          {Array.from({ length: chapterCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`chip${n === ch ? ' active' : ''}`}
              onClick={() => go(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {error && <p className="empty">{error}</p>}

      <AnimatePresence mode="wait">
        <motion.article
          key={`${bookId}-${ch}`}
          className="reader"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.28 }}
        >
          {!book && !error && <p className="empty">Читаємо Писання…</p>}
          {verses.map((v) => (
            <p className="verse" key={v.n}>
              <b>{v.n}</b>
              <span>{v.t}</span>
            </p>
          ))}
        </motion.article>
      </AnimatePresence>

      <div className="cta-row" style={{ marginTop: 16 }}>
        <button className="btn btn-outline" type="button" onClick={() => go(ch - 1)} disabled={ch <= 1}>
          Попередній
        </button>
        <button
          className="btn btn-dark"
          type="button"
          onClick={() => go(ch + 1)}
          disabled={!chapterCount || ch >= chapterCount}
        >
          Наступний
        </button>
      </div>
    </div>
  )
}
