import { Navigate, Route, Routes } from 'react-router'
import BottomNav from './components/BottomNav/BottomNav.jsx'
import ExerciseFormPage from './components/ExerciseFormPage/ExerciseFormPage.jsx'
import ExercisesPage from './components/ExercisesPage/ExercisesPage.jsx'
import Header from './components/Header/Header.jsx'
import HomePage from './components/HomePage/HomePage.jsx'
import LoginPage from './components/LoginPage/LoginPage.jsx'
import OnboardingPage from './components/OnboardingPage/OnboardingPage.jsx'
import ProfilePage from './components/ProfilePage/ProfilePage.jsx'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx'
import PublicOnlyRoute from './components/PublicOnlyRoute/PublicOnlyRoute.jsx'
import RegisterPage from './components/RegisterPage/RegisterPage.jsx'
import { ROUTES } from './constants/routes.js'
import { useAuth } from './hooks/useAuth.js'

function App() {
  const { user } = useAuth()

  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.register} element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
            <Route path={ROUTES.profile} element={<ProfilePage />} />
            <Route path={ROUTES.exercises} element={<ExercisesPage />} />
            <Route path={ROUTES.newExercise} element={<ExerciseFormPage />} />
            <Route path={ROUTES.editExercise} element={<ExerciseFormPage />} />
          </Route>
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
      </main>
      {user?.onboardingCompleted && <BottomNav />}
    </>
  )
}

export default App
