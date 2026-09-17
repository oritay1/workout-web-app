import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/authApi.js'
import { AuthContext } from './AuthContext.js'

// The session lives in an httpOnly cookie, so the only way to know who is logged in is to ask the server
function AuthProvider({ children }) {
  // undefined = still checking, null = logged out
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])

  const login = useCallback(async (identifier, password) => {
    const data = await authApi.login(identifier, password)
    setUser(data.user)
  }, [])

  const register = useCallback(async (details) => {
    const data = await authApi.register(details)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading: user === undefined, login, register, logout }),
    [user, login, register, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export default AuthProvider
