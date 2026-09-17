export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  onboarding: '/welcome',
  profile: '/profile',
  exercises: '/exercises',
  newExercise: '/exercises/new',
  editExercise: '/exercises/:id/edit',
}

export const editExercisePath = (id) => `/exercises/${encodeURIComponent(id)}/edit`
