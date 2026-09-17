import { Outlet, ScrollRestoration } from 'react-router'
import BottomNav from './components/BottomNav/BottomNav.jsx'
import Header from './components/Header/Header.jsx'
import { useAuth } from './hooks/useAuth.js'

// Layout shared by every page; the routes live in router.jsx
function App() {
  const { user } = useAuth()

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      {user?.onboardingCompleted && <BottomNav />}
      <ScrollRestoration />
    </>
  )
}

export default App
