import { useNovaStore } from './store'
import { t as translate, tf as translatef, type AppLanguage } from './i18n'

/** Translate UI strings using the Settings language preference. */
export function useT() {
  const language = useNovaStore((s) => s.settings.language) as AppLanguage
  const t = (key: string) => translate(language, key)
  const tf = (key: string, vars: Record<string, string | number>) =>
    translatef(language, key, vars)
  return Object.assign(t, { tf, language })
}
