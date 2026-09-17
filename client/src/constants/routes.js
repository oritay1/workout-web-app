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
}

export const editExercisePath = (id) => `/exercises/${encodeURIComponent(id)}/edit`
export const editPlanPath = (id) => `/plans/${encodeURIComponent(id)}`
export const sessionDetailPath = (id) => `/history/${encodeURIComponent(id)}`
