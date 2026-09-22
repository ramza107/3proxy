/** date-fns locales keyed by AppLanguage. */
import { ar, de, enUS, es, fr, hi, ptBR, ru, uk, zhCN } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import type { AppLanguage } from './i18n'

const DATE_LOCALES: Record<AppLanguage, Locale> = {
  en: enUS,
  zh: zhCN,
  hi,
  es,
  fr,
  ar,
  pt: ptBR,
  ru,
  uk,
  de,
}

export function dateLocale(lang: AppLanguage | string | undefined): Locale {
  const code = (lang && lang in DATE_LOCALES ? lang : 'en') as AppLanguage
  return DATE_LOCALES[code]
}

/** BCP 47 tag for Intl (bills month labels, etc.). */
export function intlLocale(lang: AppLanguage | string | undefined): string {
  const map: Record<string, string> = {
    en: 'en-US',
    zh: 'zh-CN',
    hi: 'hi-IN',
    es: 'es',
    fr: 'fr',
    ar: 'ar',
    pt: 'pt-BR',
    ru: 'ru',
    uk: 'uk',
    de: 'de',
  }
  return map[lang || 'en'] || 'en-US'
}
