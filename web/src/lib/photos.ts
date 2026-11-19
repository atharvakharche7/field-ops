/** The backend accepts up to 5 photos per update, each a JPEG or PNG of at most 5 MB. */
export const MAX_PHOTOS = 5

/**
 * Shrinks a camera photo before upload.
 * Phone photos are 3–8 MB; this makes them about 200–400 KB, which uploads faster on
 * mobile data, costs less to store, and stays well under the 5 MB limit.
 * The result is always a JPEG, whatever the original was (PNG, or a big JPEG).
 */
export async function resizePhoto(file: File, maxSide = 1600): Promise<Blob> {
  let img: ImageBitmap
  try {
    // Reads the image and applies its rotation (EXIF), so portrait photos stay upright.
    img = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`${file.name || 'This file'} isn't a photo this browser can read. Use a JPEG or PNG.`)
  }

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the photo.')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  img.close() // free the full-size image's memory straight away

  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not process the photo.'))), 'image/jpeg', 0.7),
  )
}
