// 2023-01-01 was a Sunday, so 2023-01-(1 + day) is that weekday
export function getWeekdayName(day, language, width = 'long') {
  return new Intl.DateTimeFormat(language, { weekday: width, timeZone: 'UTC' }).format(
    new Date(Date.UTC(2023, 0, 1 + day)),
  )
}
