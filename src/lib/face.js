import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

// Icitonderwa: ibi bigenzura gusa ko mu maso haboneka neza mu ifoto.
// Ntibihamya ko umuntu ari we nyene konti (ibyo ni ikindi gikorwa).
let detectorPromise

function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )
      return FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.6,
      })
    })().catch((e) => {
      detectorPromise = undefined
      throw e
    })
  }
  return detectorPromise
}

export function preloadDetector() {
  getDetector().catch(() => {})
}

function measure(canvas) {
  const w = 256
  const h = Math.max(1, Math.round((canvas.height / canvas.width) * w))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(canvas, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const gray = new Float32Array(w * h)
  let sum = 0
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
    gray[i] = g
    sum += g
  }
  const brightness = sum / (w * h)
  // Laplacian variance = igipimo c'uko ifoto isobanutse
  let lapSum = 0
  let lapSq = 0
  let n = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const l = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i]
      lapSum += l
      lapSq += l * l
      n++
    }
  }
  const mean = lapSum / n
  const sharpness = lapSq / n - mean * mean
  return { brightness, sharpness }
}

// Isubiza { ok: true } canke { ok: false, reason: '...' }.
// `t` ni function yo guhindura (useT() ivuye muri ../i18n); nimba itatanzwe, dukoresha ingingo z'ibanze.
export async function checkProfilePhoto(canvas, t) {
  const tr = t || ((k) => k)
  const { brightness, sharpness } = measure(canvas)
  if (brightness < 55) return { ok: false, reason: tr('face.dark') }
  if (brightness > 225) return { ok: false, reason: tr('face.bright') }
  if (sharpness < 40) return { ok: false, reason: tr('face.blurry') }

  let detector
  try {
    detector = await getDetector()
  } catch {
    return { ok: false, reason: tr('face.detectorFail') }
  }
  const { detections } = detector.detect(canvas)
  if (!detections.length) return { ok: false, reason: tr('face.noFace') }
  if (detections.length > 1) return { ok: false, reason: tr('face.multiFace') }
  const box = detections[0].boundingBox
  const ratio = (box.width * box.height) / (canvas.width * canvas.height)
  if (ratio < 0.06) return { ok: false, reason: tr('face.far') }
  return { ok: true }
}
