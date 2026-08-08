import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { stations, type RadioStation } from '../data/radio'

type RadioPlayerContextValue = {
  station: RadioStation | null
  playing: boolean
  loading: boolean
  error: string
  play: (station: RadioStation) => void
  toggle: () => void
  stop: () => void
  playPrev: () => void
  playNext: () => void
}

const RadioPlayerContext = createContext<RadioPlayerContextValue | null>(null)

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [station, setStation] = useState<RadioStation | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio

    const onPlaying = () => {
      setPlaying(true)
      setLoading(false)
      setError('')
    }
    const onWaiting = () => setLoading(true)
    const onPause = () => setPlaying(false)
    const onError = () => {
      setLoading(false)
      setPlaying(false)
      setError('Не вдалося відкрити ефір. Спробуйте іншу станцію.')
    }

    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
    }
  }, [])

  const play = useCallback((next: RadioStation) => {
    const audio = audioRef.current
    if (!audio) return
    setStation(next)
    setError('')
    setLoading(true)
    if (audio.src !== next.streamUrl) {
      audio.src = next.streamUrl
    }
    void audio.play().catch(() => {
      setLoading(false)
      setPlaying(false)
      setError('Відтворення заблоковано або потік недоступний.')
    })
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !station) {
      if (!station) play(stations[0])
      return
    }
    if (audio.paused) {
      setLoading(true)
      void audio.play().catch(() => {
        setLoading(false)
        setError('Не вдалося продовжити відтворення.')
      })
    } else {
      audio.pause()
    }
  }, [play, station])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    setPlaying(false)
    setLoading(false)
    setStation(null)
    setError('')
  }, [])

  const playAtOffset = useCallback(
    (offset: number) => {
      if (!stations.length) return
      const currentIndex = station
        ? Math.max(0, stations.findIndex((s) => s.id === station.id))
        : 0
      const nextIndex = (currentIndex + offset + stations.length) % stations.length
      play(stations[nextIndex])
    },
    [play, station],
  )

  const playPrev = useCallback(() => playAtOffset(-1), [playAtOffset])
  const playNext = useCallback(() => playAtOffset(1), [playAtOffset])

  const value = useMemo(
    () => ({ station, playing, loading, error, play, toggle, stop, playPrev, playNext }),
    [station, playing, loading, error, play, toggle, stop, playPrev, playNext],
  )

  return <RadioPlayerContext.Provider value={value}>{children}</RadioPlayerContext.Provider>
}

export function useRadioPlayer() {
  const ctx = useContext(RadioPlayerContext)
  if (!ctx) throw new Error('useRadioPlayer must be used within RadioPlayerProvider')
  return ctx
}
