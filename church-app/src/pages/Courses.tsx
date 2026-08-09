import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'
import { hasCourseAccess } from '../lib/courseAccess'

type CourseCard = {
  id: string
  title: string
  subtitle: string
  audience: string
  daysCount: number
  priceUah: number
  previewDays: number
  color: string
  description: string
  includes: string[]
}

type Catalog = {
  title: string
  description: string
  courses: CourseCard[]
}

export function Courses() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(assetUrl('courses/index.json'))
      .then((r) => {
        if (!r.ok) throw new Error('fail')
        return r.json()
      })
      .then(setCatalog)
      .catch(() => setError('Не вдалося завантажити курси'))
  }, [])

  return (
    <div className="page">
      <div className="topbar">
        <Link className="icon-btn" to="/shop" aria-label="Назад">
          ←
        </Link>
        <h1 className="section-title" style={{ margin: 0, fontSize: '1.55rem' }}>
          Курси на місяць
        </h1>
      </div>

      <p className="section-lead">
        {catalog
          ? catalog.description
          : 'Завантаження…'}
      </p>

      {error && <p className="empty">{error}</p>}

      <div className="stack" style={{ marginTop: 8 }}>
        {catalog?.courses.map((course, i) => {
          const owned = hasCourseAccess(course.id)
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link className="tile course-card" to={`/shop/courses/${course.id}`}>
                <div className="course-card-top">
                  <strong>{course.title}</strong>
                  <span className="price">{course.priceUah} ₴</span>
                </div>
                <span>{course.subtitle}</span>
                <span className="free-book-meta">
                  {course.daysCount} днів · {course.audience}
                  {owned ? ' · відкрито' : ` · ${course.previewDays} дні безкоштовно`}
                </span>
                <span className="course-bar" style={{ background: course.color }} />
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
