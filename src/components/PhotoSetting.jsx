import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import CameraCapture from './CameraCapture'
import { Avatar } from './PostCard'
import { compressImage } from '../lib/image'

export default function PhotoSetting() {
  const t = useT()
  const { user, profile, reloadProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [taking, setTaking] = useState(false)

  async function save(blob) {
    setBusy(true)
    setError('')
    const oldPath = profile.profile_photo_path
    let uploadedPath
    try {
      const small = await compressImage(blob, 800, 0.85)
      uploadedPath = `${user.id}/${Date.now()}.jpg`
      const up = await supabase.storage.from('profile-photos').upload(uploadedPath, small, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { error } = await supabase.from('profiles').update({ profile_photo_path: uploadedPath }).eq('user_id', user.id)
      if (error) throw error
      if (oldPath) await supabase.storage.from('profile-photos').remove([oldPath])
      await reloadProfile()
      setMsg(t('settings.photoDone'))
      setTaking(false)
    } catch (err) {
      if (uploadedPath) await supabase.storage.from('profile-photos').remove([uploadedPath])
      setError(err.message || t('common.saveFail'))
    }
    setBusy(false)
  }

  return (
    <div className="card stack">
      <p className="muted small">{t('settings.photoHelp')}</p>
      {!taking ? (
        <div className="row center">
          <Avatar profile={profile} size={72} />
          <button className="btn" onClick={() => { setTaking(true); setMsg(''); setError('') }}>{t('camera.open')}</button>
        </div>
      ) : busy ? (
        <p>{t('camera.checking')}</p>
      ) : (
        <CameraCapture onAccept={save} />
      )}
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
