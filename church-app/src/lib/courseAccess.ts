const KEY = 'blagovist-owned-courses'
const PLUS_KEY = 'blagovist-plus'

export function getOwnedCourses(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function ownCourse(courseId: string) {
  const owned = new Set(getOwnedCourses())
  owned.add(courseId)
  localStorage.setItem(KEY, JSON.stringify([...owned]))
}

export function hasCourseAccess(courseId: string): boolean {
  if (localStorage.getItem(PLUS_KEY) === '1') return true
  return getOwnedCourses().includes(courseId)
}

export function activatePlusDemo() {
  localStorage.setItem(PLUS_KEY, '1')
}

export function hasPlus(): boolean {
  return localStorage.getItem(PLUS_KEY) === '1'
}
