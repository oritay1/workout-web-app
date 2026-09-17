export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  onboarding: '/welcome',
  profile: '/profile',
  exercises: '/exercises',
  newExercise: '/exercises/new',
  editExercise: '/exercises/:id/edit',
  plans: '/plans',
  newPlan: '/plans/new',
  editPlan: '/plans/:id',
  workout: '/workout',
  history: '/history',
  sessionDetail: '/history/:id',
  foods: '/foods',
  newFood: '/foods/new',
  foodDetail: '/foods/:id',
  editFood: '/foods/:id/edit',
  nutrition: '/nutrition',
  dietPlans: '/nutrition/plans',
  newDietPlan: '/nutrition/plans/new',
  editDietPlan: '/nutrition/plans/:id',
}

export const editExercisePath = (id) => `/exercises/${encodeURIComponent(id)}/edit`
export const editPlanPath = (id) => `/plans/${encodeURIComponent(id)}`
export const sessionDetailPath = (id) => `/history/${encodeURIComponent(id)}`
export const foodDetailPath = (id) => `/foods/${encodeURIComponent(id)}`
export const editFoodPath = (id) => `/foods/${encodeURIComponent(id)}/edit`
export const editDietPlanPath = (id) => `/nutrition/plans/${encodeURIComponent(id)}`
export const nutritionDayPath = (date) => `/nutrition?date=${encodeURIComponent(date)}`
