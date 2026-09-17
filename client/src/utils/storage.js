// localStorage can throw (private mode, blocked storage) - never let that break the app
export function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
