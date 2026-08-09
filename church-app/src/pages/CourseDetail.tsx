import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'
import { hasCourseAccess, ownCourse } from '../lib/courseAccess'

type DayMeta = {
  day: number
  title: string
}

type Course = {
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
  days: DayMeta[]
}

export function CourseDetail() {
  const { courseId = '' } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [owned, setOwned] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setOwned(hasCourseAccess(courseId))
    fetch(assetUrl(`courses/${courseId}.json`))
      .then((r) => {
        if (!r.ok) throw new Error('fail')
        return r.json()
      })
      .then(setCourse)
      .catch(() => setError('Курс не знайдено'))
  }, [courseId])

  const buy = () => {
    ownCourse(courseId)
    setOwned(true)
    setToast('Курс відкрито в демо-режимі. Оплату (LiqPay/Stripe) підключимо пізніше.')
    window.setTimeout(() => setToast(''), 3200)
  }

  if (error) {
    return (
      <div className="page">
        <Link className="icon-btn" to="/shop/courses">
          ←
        </Link>
        <p className="empty">{error}</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="page">
        <p className="empty">Завантаження курсу…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topbar">
        <Link className="icon-btn" to="/shop/courses" aria-label="Назад">
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="section-title" style={{ margin: 0, fontSize: '1.35rem' }}>
            {course.title}
          </h1>
          <p className="section-lead" style={{ margin: 0 }}>
            {course.daysCount} днів · {course.audience}
          </p>
        </div>
      </div>

      <article className="tile tile-accent" style={{ marginBottom: 14 }}>
        <p style={{ margin: 0 }}>{course.description}</p>
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--muted)' }}>
          {course.includes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="cta-row" style={{ marginTop: 14, alignItems: 'center' }}>
          {!owned ? (
            <button className="btn btn-primary" type="button" onClick={buy}>
              Купити · {course.priceUah} ₴
            </button>
          ) : (
            <span className="badge premium">Курс відкрито</span>
          )}
          <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Перші {course.previewDays} дні доступні безкоштовно
          </span>
        </div>
      </article>

      <h2 className="section-title" style={{ fontSize: '1.45rem', marginBottom: 10 }}>
        Програма на {course.daysCount} днів
      </h2>

      <div className="stack">
        {course.days.map((d, i) => {
          const locked = !owned && d.day > course.previewDays
          return (
            <motion.div
              key={d.day}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 24) * 0.015 }}
            >
              {locked ? (
                <div className="tile course-day-locked">
                  <strong>
                    День {d.day}. {d.title}
                  </strong>
                  <span>Закрито · купіть курс, щоб відкрити</span>
                </div>
              ) : (
                <Link className="tile" to={`/shop/courses/${course.id}/day/${d.day}`}>
                  <strong>
                    День {d.day}. {d.title}
                  </strong>
                  <span style={{ color: 'var(--muted)' }}>Відкрити заняття →</span>
                </Link>
              )}
            </motion.div>
          )
        })}
      </div>

      {toast && (
        <div className="tile support-toast" style={{ background: 'var(--ink)', color: '#f8f4ea' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
