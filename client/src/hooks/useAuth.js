import { use } from 'react'
import { AuthContext } from '../context/AuthContext.js'

export function useAuth() {
  return use(AuthContext)
}
