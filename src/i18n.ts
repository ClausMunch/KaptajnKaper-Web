import { dataMessages, messages } from './locales'

export type Locale = 'da' | 'en'
export type MessageKey = keyof typeof messages
export type TextSource = string | (() => string)

const listeners = new Set<() => void>()
let locale: Locale = 'da'

try {
  const saved = localStorage.getItem('kaptajn-kaper-language')
  if (saved === 'en' || saved === 'da') locale = saved
} catch {}

export function getLocale(): Locale {
  return locale
}

export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setLocale(next: Locale): void {
  if (next === locale) return
  locale = next
  try {
    localStorage.setItem('kaptajn-kaper-language', next)
  } catch {}
  listeners.forEach(listener => listener())
}

export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  return messages[key][locale === 'en' ? 0 : 1].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`))
}

export function translateData(value: string): string {
  return dataMessages[value]?.[locale === 'en' ? 0 : 1] ?? value
}

export function resolveText(source: TextSource): string {
  return typeof source === 'function' ? source() : source
}