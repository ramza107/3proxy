import { useNovaStore } from './store'
import { t as translate, tf as translatef, type AppLanguage } from './i18n'

/** Translate UI strings using the Settings language preference. */
export function useT() {
  const language = useNovaStore((s) => s.settings.language) as AppLanguage
  const t = (key: string) => translate(language, key)
  const tf = (key: string, vars: Record<string, string | number>) =>
    translatef(language, key, vars)
  /** Safe `life.kind.*` / `dates.kind.*` / etc. — never show raw keys. */
  const kind = (ns: string, value: string | null | undefined) => {
    const fallback = t(`${ns}.kind.other`)
    if (!value) return fallback
    const key = `${ns}.kind.${value}`
    const label = t(key)
    return label === key ? fallback : label
  }
  return Object.assign(t, { tf, kind, language })
}
