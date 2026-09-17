import { Navigate, Outlet, useLocation } from 'react-router'
import { ROUTES } from '../../constants/routes.js'
import { useAuth } from '../../hooks/useAuth.js'
import Loader from '../Loader/Loader.jsx'

// Pages under this route require a logged-in user who has seen the health screen
function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <Loader />
  if (!user) return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  if (!user.onboardingCompleted && location.pathname !== ROUTES.onboarding) {
    return <Navigate to={ROUTES.onboarding} replace />
  }
  return <Outlet />
}

export default ProtectedRoute
