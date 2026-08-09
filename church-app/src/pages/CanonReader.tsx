import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'

type CanonDoc = {
  id: string
  title: string
  category: string
  source: string
  sourceUrl: string
  language?: string
  body: string
  paragraphs: string[]
  chars: number
}

export function CanonReader() {
  const { canonId = '' } = useParams()
  const [doc, setDoc] = useState<CanonDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setDoc(null)

    fetch(assetUrl(`canons/${canonId}.json`))
      .then((r) => {
        if (!r.ok) throw new Error('not-found')
        return r.json()
      })
      .then((data: CanonDoc) => {
        if (!cancelled) setDoc(data)
      })
      .catch(() => {
        if (!cancelled) setError('Текст не знайдено')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canonId])

  const paragraphs =
    doc?.paragraphs?.length && doc.paragraphs.length > 2
      ? doc.paragraphs
      : doc?.body
        ? doc.body.split(/\n{2,}|\n/).filter(Boolean)
        : []

  const isTranslit = doc?.language === 'uk-translit' || doc?.language === 'translit'

  return (
    <div className="page library-page">
      <div className="topbar">
        <Link className="icon-btn" to="/library/canons" aria-label="Назад">
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            {doc?.title ?? 'Канон'}
          </h1>
          {doc && (
            <p className="section-lead" style={{ margin: 0 }}>
              {isTranslit ? 'Транслітерація' : 'Українською'} · {doc.source}
            </p>
          )}
        </div>
      </div>

      {loading && <p className="empty">Завантаження…</p>}
      {error && <p className="empty">{error}</p>}

      {doc && isTranslit && (
        <p className="tile" style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 12 }}>
          Українська вкладка на джерелі неповна — показано транслітерацію. Звіряйте з молитвословом
          вашої Церкви.
        </p>
      )}

      {!!paragraphs.length && (
        <motion.article
          className="reader canon-reader"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {paragraphs.map((p, i) => {
            const isHeading =
              /^(Пісня|Піснь|Песнь|Кондак|Ікос|Икос|Молитва|Сідальний|Тропар)\b/i.test(p) &&
              p.length < 90
            return (
              <p
                key={i}
                className={isHeading ? 'canon-heading' : undefined}
                style={{ margin: '0 0 12px', lineHeight: 1.65, fontSize: '1.05rem' }}
              >
                {p}
              </p>
            )
          })}
        </motion.article>
      )}

      {doc?.sourceUrl && (
        <p className="section-lead" style={{ marginTop: 16, fontSize: '0.78rem' }}>
          Джерело:{' '}
          <a href={doc.sourceUrl} target="_blank" rel="noreferrer">
            blagovist.info
          </a>
        </p>
      )}
    </div>
  )
}
