// To add a language: create src/locales/<code>.json and add one entry here
export const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'he', name: 'עברית', dir: 'rtl' },
]

export const DEFAULT_LANGUAGE = 'en'

export function getLanguage(code) {
  return LANGUAGES.find((language) => language.code === code)
}
