import { Navigate, Outlet } from 'react-router'
import { ROUTES } from '../../constants/routes.js'
import { useAuth } from '../../hooks/useAuth.js'
import Loader from '../Loader/Loader.jsx'

// Login/register pages - a logged-in user is sent to the app instead
function PublicOnlyRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <Loader />
  if (user) return <Navigate to={ROUTES.home} replace />
  return <Outlet />
}

export default PublicOnlyRoute
