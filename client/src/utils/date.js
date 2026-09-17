const pad = (number) => String(number).padStart(2, '0')

// "YYYY-MM-DD" in the user's local time zone
export function toDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function yearsAgoInputValue(years) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return toDateInputValue(date)
}

// Calendar dates are stored as UTC midnight, so format them in UTC to avoid showing the previous day
export function formatDate(dateString, language) {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${dateString}T00:00:00Z`),
  )
}
