import { Navigate, createBrowserRouter } from 'react-router'
import App from './App.jsx'
import DietPlanEditorPage from './components/DietPlanEditorPage/DietPlanEditorPage.jsx'
import DietPlansPage from './components/DietPlansPage/DietPlansPage.jsx'
import ExerciseFormPage from './components/ExerciseFormPage/ExerciseFormPage.jsx'
import ExercisesPage from './components/ExercisesPage/ExercisesPage.jsx'
import FoodDetailPage from './components/FoodDetailPage/FoodDetailPage.jsx'
import FoodFormPage from './components/FoodFormPage/FoodFormPage.jsx'
import FoodsPage from './components/FoodsPage/FoodsPage.jsx'
import HistoryPage from './components/HistoryPage/HistoryPage.jsx'
import HomePage from './components/HomePage/HomePage.jsx'
import LiveWorkoutPage from './components/LiveWorkoutPage/LiveWorkoutPage.jsx'
import LoginPage from './components/LoginPage/LoginPage.jsx'
import NutritionPage from './components/NutritionPage/NutritionPage.jsx'
import OnboardingPage from './components/OnboardingPage/OnboardingPage.jsx'
import PlanEditorPage from './components/PlanEditorPage/PlanEditorPage.jsx'
import PlansPage from './components/PlansPage/PlansPage.jsx'
import ProfilePage from './components/ProfilePage/ProfilePage.jsx'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx'
import PublicOnlyRoute from './components/PublicOnlyRoute/PublicOnlyRoute.jsx'
import RegisterPage from './components/RegisterPage/RegisterPage.jsx'
import SessionDetailPage from './components/SessionDetailPage/SessionDetailPage.jsx'
import { ROUTES } from './constants/routes.js'

// A data router (not <BrowserRouter>) so pages can block navigation when there are unsaved changes
export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: ROUTES.login, element: <LoginPage /> },
          { path: ROUTES.register, element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: ROUTES.home, element: <HomePage /> },
          { path: ROUTES.onboarding, element: <OnboardingPage /> },
          { path: ROUTES.profile, element: <ProfilePage /> },
          { path: ROUTES.exercises, element: <ExercisesPage /> },
          { path: ROUTES.newExercise, element: <ExerciseFormPage /> },
          { path: ROUTES.editExercise, element: <ExerciseFormPage /> },
          { path: ROUTES.plans, element: <PlansPage /> },
          { path: ROUTES.newPlan, element: <PlanEditorPage /> },
          { path: ROUTES.editPlan, element: <PlanEditorPage /> },
          { path: ROUTES.workout, element: <LiveWorkoutPage /> },
          { path: ROUTES.history, element: <HistoryPage /> },
          { path: ROUTES.sessionDetail, element: <SessionDetailPage /> },
          { path: ROUTES.foods, element: <FoodsPage /> },
          { path: ROUTES.newFood, element: <FoodFormPage /> },
          { path: ROUTES.foodDetail, element: <FoodDetailPage /> },
          { path: ROUTES.editFood, element: <FoodFormPage /> },
          { path: ROUTES.nutrition, element: <NutritionPage /> },
          { path: ROUTES.dietPlans, element: <DietPlansPage /> },
          { path: ROUTES.newDietPlan, element: <DietPlanEditorPage /> },
          { path: ROUTES.editDietPlan, element: <DietPlanEditorPage /> },
        ],
      },
      { path: '*', element: <Navigate to={ROUTES.home} replace /> },
    ],
  },
])
