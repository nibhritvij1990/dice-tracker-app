import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
const Splash = lazy(() => import('./screens/Splash.tsx'))
const Home = lazy(() => import('./screens/Home.tsx'))
const Tracker = lazy(() => import('./screens/Tracker.tsx'))
const Profile = lazy(() => import('./screens/Profile.tsx'))
const Start = lazy(() => import('./screens/Start.tsx'))

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<Splash />} />
        <Route path="/home" element={<Home />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/start" element={<Start />} />
      </Routes>
    </Suspense>
  )
}

export default App
