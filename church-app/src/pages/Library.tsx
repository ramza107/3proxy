import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LibraryIcon } from '../components/LibraryIcons'
import { libraryCategories } from '../data/library'
import { projectSupport } from '../data/support'

function categoryTo(id: string, kind: string) {
  if (kind === 'bible-ot') return '/bible?testament=Старий%20Завіт'
  if (kind === 'bible-nt') return '/bible?testament=Новий%20Завіт'
  if (kind === 'bible-psa') return '/bible/psa/1'
  if (kind === 'free-books') return '/library/free-books'
  return `/library/${id}`
}

export function Library() {
  return (
    <div className="page library-page">
      <div className="library-top">
        <h1 className="section-title" style={{ margin: 0 }}>
          Бібліотека
        </h1>
      </div>

      <div className="library-grid">
        {libraryCategories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Link className="library-card" to={categoryTo(cat.id, cat.kind)}>
              <span className="library-card-icon">
                <LibraryIcon name={cat.icon} />
              </span>
              <strong>{cat.title}</strong>
            </Link>
          </motion.div>
        ))}
      </div>

      <Link className="btn btn-primary library-support" to="/support">
        {projectSupport.title}
      </Link>
    </div>
  )
}
