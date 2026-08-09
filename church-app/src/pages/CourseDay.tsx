import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { assetUrl } from '../lib/assetUrl'
import { hasCourseAccess } from '../lib/courseAccess'

type Quiz = {
  question: string
  options: string[]
  answer: number
  explain: string
}

type Day = {
  day: number
  title: string
  reading: string
  scripture?: string
  minutes?: number
  lesson?: string[]
  story: string[]
  questions?: string[]
  reflect: string
  schedule?: {
    morning: string
    midday: string
    evening: string
  }
  practice: string
  prayer: string
  quiz?: Quiz
}

type Course = {
  id: string
  title: string
  daysCount: number
  previewDays: number
  days: Day[]
}

export function CourseDay() {
  const { courseId = '', dayNumber = '' } = useParams()
  const dayN = Number(dayNumber)
  const [course, setCourse] = useState<Course | null>(null)
  const [day, setDay] = useState<Day | null>(null)
  const [locked, setLocked] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setPicked(null)
    fetch(assetUrl(`courses/${courseId}.json`))
      .then((r) => {
        if (!r.ok) throw new Error('fail')
        return r.json()
      })
      .then((data: Course) => {
        setCourse(data)
        const found = data.days.find((d) => d.day === dayN)
        if (!found) throw new Error('day')
        const owned = hasCourseAccess(courseId)
        const isLocked = !owned && found.day > data.previewDays
        setLocked(isLocked)
        setDay(isLocked ? null : found)
      })
      .catch(() => setError('Заняття не знайдено'))
  }, [courseId, dayN])

  if (error) {
    return (
      <div className="page">
        <Link className="icon-btn" to={`/shop/courses/${courseId}`}>
          ←
        </Link>
        <p className="empty">{error}</p>
      </div>
    )
  }

  if (locked) {
    return (
      <div className="page">
        <Link className="icon-btn" to={`/shop/courses/${courseId}`}>
          ←
        </Link>
        <p className="empty">Це заняття доступне після покупки курсу.</p>
        <Link className="btn btn-primary" to={`/shop/courses/${courseId}`} style={{ display: 'inline-block' }}>
          До курсу
        </Link>
      </div>
    )
  }

  if (!course || !day) {
    return (
      <div className="page">
        <p className="empty">Завантаження…</p>
      </div>
    )
  }

  const paragraphs = day.lesson?.length ? day.lesson : day.story
  const questions =
    day.questions?.length ? day.questions : day.reflect ? [day.reflect] : []
  const prev = day.day > 1 ? day.day - 1 : null
  const next = day.day < course.daysCount ? day.day + 1 : null

  return (
    <div className="page">
      <div className="topbar">
        <Link className="icon-btn" to={`/shop/courses/${course.id}`} aria-label="Назад">
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            День {day.day}. {day.title}
          </h1>
          <p className="section-lead" style={{ margin: 0 }}>
            {course.title}
            {day.minutes ? ` · ${day.minutes} хв` : ''}
          </p>
        </div>
      </div>

      <motion.article
        className="reader kids-lesson"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={day.day}
      >
        <div className="kids-verse">
          <p>«{day.scripture || day.reading}»</p>
          <span>{day.reading}</span>
        </div>

        <h3 className="kids-h">Урок дня</h3>
        {paragraphs.map((p, i) => (
          <p key={i} className="kids-p">
            {p}
          </p>
        ))}

        {!!questions.length && (
          <>
            <h3 className="kids-h">Питання для роздуму</h3>
            <ol className="course-questions">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </>
        )}

        <h3 className="kids-h">На весь день</h3>
        {day.schedule ? (
          <div className="stack course-schedule">
            <div className="tile">
              <strong>Ранок</strong>
              <span>{day.schedule.morning}</span>
            </div>
            <div className="tile">
              <strong>День</strong>
              <span>{day.schedule.midday}</span>
            </div>
            <div className="tile">
              <strong>Вечір</strong>
              <span>{day.schedule.evening}</span>
            </div>
          </div>
        ) : (
          <p className="kids-p">{day.practice}</p>
        )}

        <h3 className="kids-h">Молитва</h3>
        <p className="kids-p" style={{ fontStyle: 'italic' }}>
          {day.prayer}
        </p>

        {day.quiz && (
          <>
            <h3 className="kids-h">Перевіримо?</h3>
            <p style={{ fontWeight: 600 }}>{day.quiz.question}</p>
            <div className="stack" style={{ marginTop: 10 }}>
              {day.quiz.options.map((opt, idx) => {
                let cls = 'quiz-option'
                if (picked !== null) {
                  if (idx === day.quiz!.answer) cls += ' correct'
                  else if (idx === picked) cls += ' wrong'
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    className={cls}
                    disabled={picked !== null}
                    onClick={() => setPicked(idx)}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {picked !== null && (
              <p style={{ marginTop: 12, color: 'var(--muted)' }}>{day.quiz.explain}</p>
            )}
          </>
        )}

        <div className="cta-row" style={{ marginTop: 22 }}>
          {prev && (
            <Link className="btn btn-outline" to={`/shop/courses/${course.id}/day/${prev}`}>
              ← День {prev}
            </Link>
          )}
          {next && (
            <Link className="btn btn-primary" to={`/shop/courses/${course.id}/day/${next}`}>
              День {next} →
            </Link>
          )}
          {!next && (
            <Link className="btn btn-primary" to={`/shop/courses/${course.id}`}>
              Завершити курс
            </Link>
          )}
        </div>
      </motion.article>
    </div>
  )
}
