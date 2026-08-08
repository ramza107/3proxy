import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'

type FreeBook = {
  id: number
  title: string
  authors: string
  textUrl: string
  htmlUrl?: string | null
  epubUrl?: string | null
  license: string
  source: string
  subjects: string[]
}

function stripGutenbergBoilerplate(raw: string): string {
  const startMarkers = [
    '*** START OF THE PROJECT GUTENBERG EBOOK',
    '*** START OF THIS PROJECT GUTENBERG EBOOK',
    '***START OF THE PROJECT GUTENBERG EBOOK',
  ]
  const endMarkers = [
    '*** END OF THE PROJECT GUTENBERG EBOOK',
    '*** END OF THIS PROJECT GUTENBERG EBOOK',
    '***END OF THE PROJECT GUTENBERG EBOOK',
  ]
  let text = raw.replace(/\r\n/g, '\n')
  for (const m of startMarkers) {
    const i = text.indexOf(m)
    if (i >= 0) {
      const nl = text.indexOf('\n', i)
      text = text.slice(nl >= 0 ? nl + 1 : i + m.length)
      break
    }
  }
  for (const m of endMarkers) {
    const i = text.indexOf(m)
    if (i >= 0) text = text.slice(0, i)
  }
  return text.trim()
}

export function FreeBookReader() {
  const { bookId = '' } = useParams()
  const id = Number(bookId)
  const [book, setBook] = useState<FreeBook | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setText('')

    fetch(assetUrl('free-books/catalog.json'))
      .then((r) => r.json())
      .then(async (catalog: { books: FreeBook[] }) => {
        const found = catalog.books.find((b) => b.id === id)
        if (!found) throw new Error('not-found')
        if (!cancelled) setBook(found)

        // Спробуємо прочитати текст у застосунку (може блокуватись CORS)
        try {
          const res = await fetch(found.textUrl)
          if (!res.ok) throw new Error('text-fail')
          const raw = await res.text()
          if (!cancelled) setText(stripGutenbergBoilerplate(raw))
        } catch {
          if (!cancelled) {
            setError('Текст відкривається на Project Gutenberg (обмеження браузера).')
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Книгу не знайдено в каталозі')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const preview = useMemo(() => {
    if (!text) return []
    return text.split(/\n{2,}/).filter(Boolean).slice(0, 80)
  }, [text])

  const gutenbergPage = book ? `https://www.gutenberg.org/ebooks/${book.id}` : ''

  return (
    <div className="page library-page">
      <div className="topbar">
        <Link className="icon-btn" to="/library/free-books" aria-label="Назад">
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            {book?.title ?? 'Книга'}
          </h1>
          {book && (
            <p className="section-lead" style={{ margin: 0 }}>
              {book.authors}
            </p>
          )}
        </div>
      </div>

      {loading && <p className="empty">Завантаження…</p>}

      {book && (
        <div className="stack" style={{ marginBottom: 14 }}>
          <article className="tile">
            <span className="badge">public domain</span>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              {book.license}. Джерело: {book.source}.
            </p>
            <div className="cta-row" style={{ marginTop: 12 }}>
              <a className="btn btn-primary" href={gutenbergPage} target="_blank" rel="noreferrer">
                Читати на Gutenberg
              </a>
              {book.epubUrl && (
                <a className="btn btn-outline" href={book.epubUrl} target="_blank" rel="noreferrer">
                  EPUB
                </a>
              )}
            </div>
          </article>
        </div>
      )}

      {error && !text && (
        <p className="tile" style={{ color: 'var(--muted)' }}>
          {error}
        </p>
      )}

      {!!preview.length && (
        <motion.article
          className="reader free-book-reader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {preview.map((p, i) => (
            <p key={i} style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {p}
            </p>
          ))}
          {text.split(/\n{2,}/).length > preview.length && (
            <p style={{ color: 'var(--muted)' }}>
              Показано початок книги. Повний текст — на Project Gutenberg.
            </p>
          )}
        </motion.article>
      )}
    </div>
  )
}
