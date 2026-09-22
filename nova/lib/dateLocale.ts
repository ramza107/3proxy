/** date-fns locales keyed by app language codes. */
import type { Locale } from 'date-fns'
import { ar } from 'date-fns/locale/ar'
import { de } from 'date-fns/locale/de'
import { enUS } from 'date-fns/locale/en-US'
import { es } from 'date-fns/locale/es'
import { fr } from 'date-fns/locale/fr'
import { hi } from 'date-fns/locale/hi'
import { ptBR } from 'date-fns/locale/pt-BR'
import { ru } from 'date-fns/locale/ru'
import { uk } from 'date-fns/locale/uk'
import { zhCN } from 'date-fns/locale/zh-CN'

const DATE_LOCALES: Record<string, Locale> = {
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

export function dateLocale(lang: string | undefined): Locale {
  return DATE_LOCALES[lang || ''] || enUS
}

/** BCP 47 tag for Intl (bills month labels, etc.). */
export function intlLocale(lang: string | undefined): string {
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
