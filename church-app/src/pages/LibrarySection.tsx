import { Link, useParams } from 'react-router-dom'
import { getCategory, textsForCategory } from '../data/library'

export function LibrarySection() {
  const { categoryId = '' } = useParams()
  const category = getCategory(categoryId)
  const texts = textsForCategory(categoryId)

  if (!category || category.kind !== 'texts') {
    return (
      <div className="page">
        <Link className="icon-btn" to="/library" aria-label="Назад">
          ←
        </Link>
        <p className="empty">Розділ не знайдено</p>
      </div>
    )
  }

  return (
    <div className="page library-page">
      <div className="topbar">
        <Link className="icon-btn" to="/library" aria-label="Назад">
          ←
        </Link>
        <h1 className="section-title" style={{ margin: 0, fontSize: '1.55rem' }}>
          {category.title}
        </h1>
      </div>
      <p className="section-lead">Оберіть текст для читання.</p>
      <div className="stack">
        {texts.map((text) => (
          <Link key={text.id} className="tile" to={`/library/read/${text.id}`}>
            <strong>{text.title}</strong>
            {text.subtitle && <span>{text.subtitle}</span>}
          </Link>
        ))}
        {!texts.length && <p className="empty">Тексти скоро зʼявляться</p>}
      </div>
    </div>
  )
}
