import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MiniPlayer } from './MiniPlayer'
import { useRadioPlayer } from '../context/RadioPlayerContext'

export function Layout() {
  const { station } = useRadioPlayer()

  return (
    <div className={`app-shell${station ? ' with-player' : ''}`}>
      <Outlet />
      <MiniPlayer />
      <BottomNav />
    </div>
  )
}
