import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
const Splash = lazy(() => import('./screens/Splash.tsx'))
const Home = lazy(() => import('./screens/Home.tsx'))
const Home2 = lazy(() => import('./screens/Home2.tsx'))
const Home3 = lazy(() => import('./screens/Home3.tsx'))
const Home4 = lazy(() => import('./screens/Home4.tsx'))
const Home5 = lazy(() => import('./screens/Home5.tsx'))
const Tracker = lazy(() => import('./screens/Tracker.tsx'))
const Tracker2 = lazy(() => import('./screens/Tracker2.tsx'))
const Profile = lazy(() => import('./screens/Profile.tsx'))
const Profile2 = lazy(() => import('./screens/Profile2.tsx'))
import Start from './screens/Start.tsx'

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<Splash />} />
        <Route path="/home" element={<Home5 />} />
        <Route path="/home_old" element={<Home />} />
        <Route path="/home2" element={<Home2 />} />
        <Route path="/home3" element={<Home3 />} />
        <Route path="/home4" element={<Home4 />} />
        <Route path="/home5" element={<Home5 />} />
        <Route path="/tracker" element={<Tracker2 />} />
        <Route path="/tracker2" element={<Tracker2 />} />
        <Route path="/tracker_old" element={<Tracker />} />
        <Route path="/profile" element={<Profile2 />} />
        <Route path="/profile2" element={<Profile2 />} />
        <Route path="/profile_old" element={<Profile />} />
        <Route path="/start" element={<Start />} />
      </Routes>
    </Suspense>
  )
}

export default App
