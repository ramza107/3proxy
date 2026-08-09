import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { brand } from '../brand'
import { lessons, type Lesson } from '../data/kids'

type AgeFilter = 'Усі' | Lesson['age']

export function Kids() {
  const [age, setAge] = useState<AgeFilter>('Усі')
  const [active, setActive] = useState<Lesson | null>(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)

  const list = useMemo(
    () => lessons.filter((l) => age === 'Усі' || l.age === age),
    [age],
  )

  function openLesson(lesson: Lesson) {
    setActive(lesson)
    setQuizIndex(0)
    setPicked(null)
    setScore(0)
  }

  function closeLesson() {
    setActive(null)
    setQuizIndex(0)
    setPicked(null)
    setScore(0)
  }

  const quiz = active?.quiz[quizIndex]
  const quizDone = active ? quizIndex >= active.quiz.length : false

  return (
    <div className="page">
      <h1 className="section-title">Дітям</h1>
      <p className="section-lead">
        Біблійні історії з поясненням, віршем для запамʼятовування, практикою та квізом.
      </p>

      <div className="chip-row">
        {(['Усі', '3–6', '7–10', '11–14'] as const).map((a) => (
          <button
            key={a}
            type="button"
            className={`chip${age === a ? ' active' : ''}`}
            onClick={() => {
              setAge(a)
              closeLesson()
            }}
          >
            {a === 'Усі' ? 'Усі віки' : `${a} р.`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!active ? (
          <motion.div
            key="list"
            className="stack"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {list.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                className="tile"
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
                onClick={() => openLesson(lesson)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{lesson.title}</strong>
                  <span className={`badge${lesson.premium ? ' premium' : ''}`}>
                    {lesson.premium ? brand.plus : 'Безкоштовно'}
                  </span>
                </div>
                <span>
                  {lesson.age} р. · {lesson.minutes} хв · {lesson.quiz.length} питання
                </span>
                <span style={{ color: 'var(--muted)' }}>{lesson.summary}</span>
                {lesson.premium && (
                  <span>
                    Урок з пакета {brand.plus}.{' '}
                    <Link to="/shop" style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>
                      Підтримати в крамниці
                    </Link>
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.article
            key={active.id}
            className="reader kids-lesson"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
          >
            <button
              className="btn btn-outline"
              type="button"
              onClick={closeLesson}
              style={{ marginBottom: 14 }}
            >
              ← До уроків
            </button>

            <h2 className="section-title" style={{ fontSize: '1.7rem', marginBottom: 4 }}>
              {active.title}
            </h2>
            <p className="section-lead" style={{ marginTop: 0 }}>
              {active.age} р. · {active.minutes} хв · {active.summary}
            </p>

            <h3 className="kids-h">Історія</h3>
            {active.story.map((p, i) => (
              <p key={i} className="kids-p">
                {p}
              </p>
            ))}

            <div className="kids-verse">
              <p>«{active.verse}»</p>
              <span>{active.verseRef}</span>
            </div>

            <h3 className="kids-h">Висновок</h3>
            <p className="kids-p">{active.moral}</p>

            <h3 className="kids-h">Спробуй сьогодні</h3>
            <p className="kids-p">{active.practice}</p>

            <h3 className="kids-h">Перевіримо?</h3>
            {!quizDone && quiz ? (
              <>
                <p style={{ color: 'var(--muted)', marginBottom: 6 }}>
                  Питання {quizIndex + 1} з {active.quiz.length}
                </p>
                <p style={{ fontWeight: 600 }}>{quiz.question}</p>
                <div className="stack" style={{ marginTop: 10 }}>
                  {quiz.options.map((opt, idx) => {
                    let cls = 'quiz-option'
                    if (picked !== null) {
                      if (idx === quiz.answer) cls += ' correct'
                      else if (idx === picked) cls += ' wrong'
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={cls}
                        onClick={() => {
                          if (picked !== null) return
                          setPicked(idx)
                          if (idx === quiz.answer) setScore((s) => s + 1)
                        }}
                        disabled={picked !== null}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
                {picked !== null && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>
                      {picked === quiz.answer ? 'Правильно!' : `Правильна відповідь: ${quiz.options[quiz.answer]}`}
                    </p>
                    <p style={{ color: 'var(--muted)', marginBottom: 12 }}>{quiz.explain}</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setQuizIndex((i) => i + 1)
                        setPicked(null)
                      }}
                    >
                      {quizIndex + 1 < active.quiz.length ? 'Далі' : 'Результат'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="kids-result">
                <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>
                  Результат: {score} з {active.quiz.length}
                </p>
                <p style={{ color: 'var(--muted)', marginBottom: 12 }}>
                  {score === active.quiz.length
                    ? 'Чудово! Ти уважно слухав історію.'
                    : score >= Math.ceil(active.quiz.length / 2)
                      ? 'Добре! Перечитай вірш і спробуй ще раз пізніше.'
                      : 'Не здавайся — повернись до історії й пройди квіз знову.'}
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setQuizIndex(0)
                    setPicked(null)
                    setScore(0)
                  }}
                >
                  Пройти квіз ще раз
                </button>
              </div>
            )}
          </motion.article>
        )}
      </AnimatePresence>
    </div>
  )
}
