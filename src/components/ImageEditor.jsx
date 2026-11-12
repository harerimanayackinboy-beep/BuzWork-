import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'

const FRAME = 300 // ikibanza c'agasanduku (CSS px, ingese)
const OUT = 1000 // ingano y'ifoto nyuma yo gukata (px)

// Ishusho itumbuzwa/igacika (rotate + pan/zoom crop) imbere yo kuyishiraho
export default function ImageEditor({ file, onCancel, onSave }) {
  const t = useT()
  const [src, setSrc] = useState(null) // object URL y'ifoto iri gukorwaho ubu
  const [natural, setNatural] = useState(null) // {w,h}
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onImgLoad(e) {
    setNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  if (!natural) {
    return (
      <div className="sheet-overlay" onClick={onCancel}>
        <img src={src} alt="" onLoad={onImgLoad} style={{ display: 'none' }} />
      </div>
    )
  }

  const base = Math.max(FRAME / natural.w, FRAME / natural.h)
  const eff = base * zoom
  const dispW = natural.w * eff
  const dispH = natural.h * eff
  const maxPanX = Math.max(0, (dispW - FRAME) / 2)
  const maxPanY = Math.max(0, (dispH - FRAME) / 2)
  const clamp = (v, m) => Math.min(m, Math.max(-m, v))

  function startDrag(clientX, clientY) {
    dragRef.current = { x: clientX, y: clientY, pan }
  }
  function moveDrag(clientX, clientY) {
    if (!dragRef.current) return
    const dx = clientX - dragRef.current.x
    const dy = clientY - dragRef.current.y
    setPan({
      x: clamp(dragRef.current.pan.x + dx, maxPanX),
      y: clamp(dragRef.current.pan.y + dy, maxPanY),
    })
  }
  function endDrag() { dragRef.current = null }

  async function rotate() {
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = natural.h
    canvas.height = natural.w
    const ctx = canvas.getContext('2d')
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(img, -natural.w / 2, -natural.h / 2)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
    const url = URL.createObjectURL(blob)
    setSrc((old) => { URL.revokeObjectURL(old); return url })
    setNatural(null) // bizongere kubarwa ubwo ifoto nshasha izarangiza gupakirwa (onImgLoad)
  }

  function save() {
    const img = imgRef.current
    const sWidth = FRAME / eff
    const sx = (dispW - FRAME) / 2 - pan.x
    const sy = (dispH - FRAME) / 2 - pan.y
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    canvas.getContext('2d').drawImage(
      img,
      Math.max(0, sx / eff), Math.max(0, sy / eff), sWidth, sWidth,
      0, 0, OUT, OUT
    )
    canvas.toBlob((blob) => {
      const edited = new File([blob], file.name.replace(/\.\w+$/, '') + '-edited.jpg', { type: 'image/jpeg' })
      onSave(edited)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="sheet-overlay" style={{ alignItems: 'center' }}>
      <div className="sheet" style={{ borderRadius: 18, alignItems: 'center', maxWidth: 360 }}>
        <h2 className="center" style={{ fontSize: 16 }}>{t('new.editPhotoTitle')}</h2>
        <div
          className="img-editor-frame"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startDrag(e.clientX, e.clientY) }}
          onPointerMove={(e) => moveDrag(e.clientX, e.clientY)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onImgLoad}
            draggable={false}
            style={{
              position: 'absolute',
              left: (FRAME - dispW) / 2 + pan.x,
              top: (FRAME - dispH) / 2 + pan.y,
              width: dispW,
              height: dispH,
              touchAction: 'none',
            }}
          />
        </div>
        <input
          type="range" min="1" max="3" step="0.01" value={zoom}
          onChange={(e) => {
            const z = Number(e.target.value)
            setZoom(z)
            const eb = base * z
            const dw = natural.w * eb, dh = natural.h * eb
            setPan((p) => ({
              x: clamp(p.x, Math.max(0, (dw - FRAME) / 2)),
              y: clamp(p.y, Math.max(0, (dh - FRAME) / 2)),
            }))
          }}
          style={{ width: FRAME }}
        />
        <p className="muted small center">{t('new.editPhotoHint')}</p>
        <div className="row">
          <button type="button" className="btn ghost small" onClick={rotate}>↻ {t('new.rotate')}</button>
          <button type="button" className="btn ghost small" onClick={onCancel}>{t('new.cropCancel')}</button>
          <button type="button" className="btn small" onClick={save}>{t('new.cropSave')}</button>
        </div>
      </div>
    </div>
  )
}
