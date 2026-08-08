import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRadioPlayer } from '../context/RadioPlayerContext'

function IconPrev() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M7 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Zm2.85 5.18a1 1 0 0 1 0 1.64l7.1 4.1A1 1 0 0 0 18.5 16V8a1 1 0 0 0-1.55-.82l-7.1 4Z" />
    </svg>
  )
}

function IconNext() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M17 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Zm-3.85 5.18-7.1-4.1A1 1 0 0 0 4.5 8v8a1 1 0 0 0 1.55.82l7.1-4.1a1 1 0 0 0 0-1.54Z" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M9.2 7.1a.8.8 0 0 1 1.2-.7l7.2 4.4a.8.8 0 0 1 0 1.4l-7.2 4.4a.8.8 0 0 1-1.2-.7V7.1Z" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M8 7.25A1.25 1.25 0 0 1 9.25 6h1A1.25 1.25 0 0 1 11.5 7.25v9.5A1.25 1.25 0 0 1 10.25 18h-1A1.25 1.25 0 0 1 8 16.75v-9.5Zm5.5 0A1.25 1.25 0 0 1 14.75 6h1A1.25 1.25 0 0 1 17 7.25v9.5A1.25 1.25 0 0 1 15.75 18h-1A1.25 1.25 0 0 1 13.5 16.75v-9.5Z" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.05 7.05a1 1 0 0 1 1.4 0L12 10.6l3.55-3.55a1 1 0 1 1 1.4 1.4L13.4 12l3.55 3.55a1 1 0 0 1-1.4 1.4L12 13.4l-3.55 3.55a1 1 0 0 1-1.4-1.4L10.6 12 7.05 8.45a1 1 0 0 1 0-1.4Z"
      />
    </svg>
  )
}

export function MiniPlayer() {
  const navigate = useNavigate()
  const { station, playing, loading, toggle, stop, playPrev, playNext } = useRadioPlayer()

  return (
    <AnimatePresence>
      {station && (
        <motion.div
          className="mini-player"
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 28, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <button
            type="button"
            className="mini-player-meta"
            onClick={() => navigate('/radio')}
            aria-label="Відкрити радіо"
          >
            <span className="mini-player-art" aria-hidden="true">
              <span className={`mini-player-eq${playing && !loading ? ' is-on' : ''}`}>
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="mini-player-text">
              <strong>{station.name}</strong>
              <em>{loading ? 'Зʼєднання…' : playing ? 'В ефірі' : 'Пауза'}</em>
            </span>
          </button>

          <div className="mini-player-controls" role="group" aria-label="Керування радіо">
            <button type="button" className="mp-btn" onClick={playPrev} aria-label="Попереднє радіо">
              <IconPrev />
            </button>
            <button
              type="button"
              className="mp-btn mp-btn-main"
              onClick={toggle}
              aria-label={playing ? 'Пауза' : 'Грати'}
            >
              <span className="mp-main-disc">{playing ? <IconPause /> : <IconPlay />}</span>
            </button>
            <button type="button" className="mp-btn" onClick={playNext} aria-label="Наступне радіо">
              <IconNext />
            </button>
            <button type="button" className="mp-btn mp-btn-close" onClick={stop} aria-label="Закрити плеєр">
              <IconClose />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
