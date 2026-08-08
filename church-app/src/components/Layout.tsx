import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav />
    </div>
  )
}
