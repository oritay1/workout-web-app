const SIZE = 256

function isHeicFile(file) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image'))
    }
    img.src = url
  })
}

// Most browsers can't display HEIC (the iPhone format), so convert it to JPEG first.
// The converter is large, so it is only downloaded when actually needed.
async function decodeImage(file) {
  try {
    return await loadImage(file)
  } catch (err) {
    if (!isHeicFile(file)) throw err
    const { heicTo } = await import('heic-to')
    return loadImage(await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 }))
  }
}

// Crops the image to a centered square and shrinks it, so it is small enough to store in the DB
export async function resizeImage(file) {
  const img = await decodeImage(file)
  const side = Math.min(img.width, img.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  canvas
    .getContext('2d')
    .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  return canvas.toDataURL('image/jpeg', 0.8)
}
