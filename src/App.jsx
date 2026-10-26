import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth'
import Login, { ResetPassword } from './pages/Login'
import ProfileSetup from './pages/ProfileSetup'
import Home from './pages/Home'
import Feed from './pages/Feed'
import NewPost from './pages/NewPost'
import Seller from './pages/Seller'
import Post from './pages/Post'
import Settings from './pages/Settings'
import Messages from './pages/Messages'
import Chat from './pages/Chat'

export default function App() {
  const { session, profile, profileLoaded, recovery, clearRecovery } = useAuth()

  if (session === undefined || (session && !profileLoaded)) {
    return <div className="page"><p className="muted center">Ndikuzana…</p></div>
  }
  if (!session) return <Login />
  if (recovery) return <ResetPassword onDone={clearRecovery} />
  // Profile ntiruzura (nta foto) → subira ku kuzuza
  if (!profile || !profile.profile_photo_path) return <ProfileSetup />

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/business" element={<Feed kind="product" />} />
      <Route path="/jobs" element={<Feed kind="job" />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/chat/:id" element={<Chat />} />
      <Route path="/new/:kind" element={<NewPost />} />
      <Route path="/seller/:id" element={<Seller />} />
      <Route path="/post/:kind/:id" element={<Post />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
