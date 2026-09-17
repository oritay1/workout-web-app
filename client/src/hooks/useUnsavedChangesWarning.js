import { useCallback, useEffect, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

// Asks for confirmation before leaving a page with unsaved changes (in-app navigation and closing the tab).
// Returns a function to call right before navigating away on purpose, e.g. after saving
export function useUnsavedChangesWarning(isDirty, message) {
  const allowLeaveRef = useRef(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !allowLeaveRef.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(message)) blocker.proceed()
    else blocker.reset()
  }, [blocker, message])

  useBeforeUnload(
    useCallback(
      (event) => {
        if (isDirty && !allowLeaveRef.current) event.preventDefault()
      },
      [isDirty],
    ),
  )

  return useCallback(() => {
    allowLeaveRef.current = true
  }, [])
}
