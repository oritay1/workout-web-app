import { useEffect, useState } from 'react'

// The value, updated only after it stopped changing for `delayMs` (e.g. search while typing)
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
