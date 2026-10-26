import { useEffect, useRef, useState } from 'react'
import { checkProfilePhoto, preloadDetector } from '../lib/face'
import { useT } from '../i18n'

// Ifoto ifatirwa kuri camera gusa. Nta gallery.
export default function CameraCapture({ onAccept }) {
  const t = useT()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null) // { blob, url }

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  useEffect(() => stop, [])

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      setStarted(true)
      preloadDetector()
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      setError(t('camera.denied'))
    }
  }

  async function snap() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    setBusy(true)
    setError('')
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    const res = await checkProfilePhoto(canvas, t)
    if (!res.ok) {
      setError(res.reason)
      setBusy(false)
      return
    }
    canvas.toBlob(
      (blob) => {
        stop()
        setPreview({ blob, url: URL.createObjectURL(blob) })
        setBusy(false)
      },
      'image/jpeg',
      0.9
    )
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
    setStarted(false)
    start()
  }

  if (preview) {
    return (
      <div className="camera">
        <img className="camera-view" src={preview.url} alt={t('camera.photoAlt')} />
        <div className="row">
          <button className="btn ghost" onClick={retake}>{t('camera.retake')}</button>
          <button className="btn" onClick={() => onAccept(preview.blob)}>{t('camera.accept')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="camera">
      {!started ? (
        <>
          <p className="muted">{t('camera.intro')}</p>
          <button className="btn" onClick={start}>{t('camera.open')}</button>
        </>
      ) : (
        <>
          <video ref={videoRef} className="camera-view mirror" playsInline muted />
          <button className="btn" disabled={busy} onClick={snap}>
            {busy ? t('camera.checking') : t('camera.snap')}
          </button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
