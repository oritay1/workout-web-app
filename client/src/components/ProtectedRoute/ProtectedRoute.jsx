import { Navigate, Outlet, useLocation } from 'react-router'
import { ROUTES } from '../../constants/routes.js'
import { useAuth } from '../../hooks/useAuth.js'
import Loader from '../Loader/Loader.jsx'

// Pages under this route require a logged-in user
function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <Loader />
  if (!user) return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  return <Outlet />
}

export default ProtectedRoute
