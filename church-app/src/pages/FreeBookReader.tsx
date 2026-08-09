import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'

type CatalogBook = {
  id: number
  title: string
  titleUk: string
  authors: string
  authorsUk: string
  blurbUk?: string
  originalUrl: string
  localEn: string
  localUa: string
  license: string
  source: string
}

type BookDoc = {
  id: number
  language: string
  title: string
  authors: string
  paragraphs: string[]
  note?: string
}

type Lang = 'uk' | 'en'

const PAGE = 40

export function FreeBookReader() {
  const { bookId = '' } = useParams()
  const id = Number(bookId)
  const [meta, setMeta] = useState<CatalogBook | null>(null)
  const [lang, setLang] = useState<Lang>('uk')
  const [docs, setDocs] = useState<Partial<Record<Lang, BookDoc>>>({})
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setPage(0)
    setLang('uk')
    setDocs({})

    fetch(assetUrl('free-books/curated.json'))
      .then((r) => {
        if (!r.ok) throw new Error('catalog')
        return r.json()
      })
      .then(async (catalog: { books: CatalogBook[] }) => {
        const found = catalog.books.find((b) => b.id === id)
        if (!found) throw new Error('not-found')
        if (cancelled) return
        setMeta(found)

        const [uaRes, enRes] = await Promise.all([
          fetch(assetUrl(found.localUa)),
          fetch(assetUrl(found.localEn)),
        ])
        const next: Partial<Record<Lang, BookDoc>> = {}
        if (uaRes.ok) next.uk = await uaRes.json()
        if (enRes.ok) next.en = await enRes.json()
        if (!cancelled) {
          setDocs(next)
          if (!next.uk && next.en) setLang('en')
          if (!next.uk && !next.en) setError('Текст книги ще готується')
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

  const active = docs[lang]
  const paragraphs = active?.paragraphs ?? []
  const totalPages = Math.max(1, Math.ceil(paragraphs.length / PAGE))
  const slice = useMemo(() => {
    const start = page * PAGE
    return paragraphs.slice(start, start + PAGE)
  }, [paragraphs, page])

  useEffect(() => {
    setPage(0)
  }, [lang])

  return (
    <div className="page library-page">
      <div className="topbar">
        <Link className="icon-btn" to="/library/free-books" aria-label="Назад">
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            {meta ? (lang === 'uk' ? meta.titleUk : meta.title) : 'Книга'}
          </h1>
          {meta && (
            <p className="section-lead" style={{ margin: 0 }}>
              {lang === 'uk' ? meta.authorsUk : meta.authors}
            </p>
          )}
        </div>
      </div>

      {loading && <p className="empty">Завантаження…</p>}
      {error && <p className="empty">{error}</p>}

      {meta && (
        <div className="stack" style={{ marginBottom: 14 }}>
          <article className="tile">
            {meta.blurbUk && (
              <p style={{ margin: '0 0 10px', color: 'var(--muted)', fontSize: '0.92rem' }}>
                {meta.blurbUk}
              </p>
            )}
            <span className="badge">public domain</span>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
              {meta.license}. Джерело оригіналу: {meta.source}.
            </p>

            <div className="canon-filters" style={{ marginTop: 12 }} role="tablist" aria-label="Мова">
              <button
                type="button"
                role="tab"
                aria-selected={lang === 'uk'}
                className={`canon-filter${lang === 'uk' ? ' is-active' : ''}`}
                onClick={() => setLang('uk')}
                disabled={!docs.uk}
              >
                Переклад (UA)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={lang === 'en'}
                className={`canon-filter${lang === 'en' ? ' is-active' : ''}`}
                onClick={() => setLang('en')}
                disabled={!docs.en}
              >
                Оригінал (EN)
              </button>
            </div>

            <div className="cta-row" style={{ marginTop: 12 }}>
              <a className="btn btn-outline" href={meta.originalUrl} target="_blank" rel="noreferrer">
                Оригінал (Gutenberg)
              </a>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setLang('uk')
                  setPage(0)
                  document.getElementById('book-text')?.scrollIntoView({ behavior: 'smooth' })
                }}
                disabled={!docs.uk}
              >
                Переклад у застосунку
              </button>
            </div>
          </article>
        </div>
      )}

      {!!slice.length && (
        <motion.article
          id="book-text"
          className="reader free-book-reader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={`${lang}-${page}`}
        >
          {active?.note && lang === 'uk' && (
            <p style={{ color: 'var(--muted)', marginBottom: 14, fontSize: '0.85rem' }}>{active.note}</p>
          )}
          {slice.map((p, i) => (
            <p key={i} style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
              {p}
            </p>
          ))}

          <div className="cta-row" style={{ marginTop: 18, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Назад
            </button>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              Стор. {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Далі →
            </button>
          </div>
        </motion.article>
      )}
    </div>
  )
}
