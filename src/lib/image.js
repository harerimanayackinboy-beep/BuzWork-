// Gutoya ifoto mbere yo kuyishira kuri Supabase (kugira app ntiremere)
export async function compressImage(fileOrBlob, maxDim = 1600, quality = 0.8) {
  const bmp = await createImageBitmap(fileOrBlob)
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Ifoto ntishobotse gutoywa'))), 'image/jpeg', quality)
  )
}

// Gukora ibikorwa vyinshi icarimwe ariko hamwe n'imipaka (ex: 4 uploads icarimwe)
export async function runPool(items, limit, worker, onProgress) {
  let next = 0
  let done = 0
  const results = new Array(items.length)
  async function run() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
      done++
      onProgress?.(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}
