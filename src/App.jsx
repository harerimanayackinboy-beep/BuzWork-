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
import Search from './pages/Search'
import Favorites from './pages/Favorites'

function OfflineBanner() {
  const { online } = useAuth()
  if (online) return null
  return (
    <div style={{
      background: '#7c2d12', color: '#fff', textAlign: 'center',
      padding: '6px 10px', fontSize: 13, fontWeight: 600,
    }}>
      📴 Nta internet ihari — ibintu bimwe bishobora kutakora neza
    </div>
  )
}

export default function App() {
  const { session, profile, profileLoaded, recovery, clearRecovery } = useAuth()

  if (session === undefined || (session && !profileLoaded)) {
    return <div className="page"><p className="muted center">Ndikuzana…</p></div>
  }
  if (!session) return <><OfflineBanner /><Login /></>
  if (recovery) return <><OfflineBanner /><ResetPassword onDone={clearRecovery} /></>
  // Profile ntiruzura (nta foto) → subira ku kuzuza
  if (!profile || !profile.profile_photo_path) return <><OfflineBanner /><ProfileSetup /></>

  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/business" element={<Feed kind="product" />} />
        <Route path="/jobs" element={<Feed kind="job" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/search" element={<Search />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/new/:kind" element={<NewPost />} />
        <Route path="/seller/:id" element={<Seller />} />
        <Route path="/post/:kind/:id" element={<Post />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
