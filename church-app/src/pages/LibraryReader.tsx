import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getLibraryText } from '../data/library'

export function LibraryReader() {
  const { textId = '' } = useParams()
  const text = getLibraryText(textId)

  if (!text) {
    return (
      <div className="page">
        <Link className="icon-btn" to="/library" aria-label="Назад">
          ←
        </Link>
        <p className="empty">Текст не знайдено</p>
      </div>
    )
  }

  return (
    <div className="page library-page">
      <div className="topbar">
        <Link className="icon-btn" to={`/library/${text.categoryId}`} aria-label="Назад">
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="section-title" style={{ margin: 0, fontSize: '1.4rem' }}>
            {text.title}
          </h1>
          {text.subtitle && (
            <p className="section-lead" style={{ margin: 0 }}>
              {text.subtitle}
            </p>
          )}
        </div>
      </div>

      <motion.article
        className="reader"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {text.body.map((p, i) => (
          <p key={i} style={{ margin: '0 0 14px', lineHeight: 1.65, fontSize: '1.05rem' }}>
            {p}
          </p>
        ))}
      </motion.article>
    </div>
  )
}
