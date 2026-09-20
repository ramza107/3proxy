import { useNovaStore } from './store'
import { t as translate, type AppLanguage } from './i18n'

/** Translate UI strings using the Settings language preference. */
export function useT() {
  const language = useNovaStore((s) => s.settings.language) as AppLanguage
  return (key: string) => translate(language, key)
}
