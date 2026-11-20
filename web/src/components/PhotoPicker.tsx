import { Button } from '@/components/ui/button'
import { MAX_PHOTOS, resizePhoto } from '@/lib/photos'
import { Camera, ImagePlus, LoaderCircle, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'

/**
 * Take or choose photos, shrink them, and show thumbnails with a remove button.
 * The parent keeps the list of resized photos (Blobs), ready to upload.
 */
export function PhotoPicker({
  photos,
  onChange,
  disabled,
}: {
  photos: Blob[]
  onChange: (photos: Blob[]) => void
  disabled?: boolean
}) {
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(0) // how many photos are being resized right now
  const room = MAX_PHOTOS - photos.length

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // so choosing the same photo again still fires onChange
    if (files.length === 0) return

    if (files.length > room) toast.warning(`You can add up to ${MAX_PHOTOS} photos per update.`)
    const accepted = files.slice(0, Math.max(room, 0))
    setProcessing(accepted.length)
    // Resize one at a time: decoding several 12-megapixel photos at once can crash a cheap phone's browser.
    const resized: Blob[] = []
    for (const file of accepted) {
      try {
        resized.push(await resizePhoto(file))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not add that photo.')
      }
      setProcessing(n => n - 1)
    }
    if (resized.length) onChange([...photos, ...resized])
  }

  const busy = disabled || processing > 0

  return (
    <div className="flex flex-col gap-3">
      {(photos.length > 0 || processing > 0) && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((photo, i) => (
            <li key={i} className="relative">
              <BlobImage blob={photo} alt={`Photo ${i + 1}`} />
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                disabled={busy}
                className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                aria-label={`Remove photo ${i + 1}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
          {Array.from({ length: processing }, (_, i) => (
            <li key={`processing-${i}`} className="flex aspect-square items-center justify-center rounded-lg border bg-muted">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Processing photo" />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {/* capture="environment" opens the back camera straight away on phones. Laptops ignore it, so it's hidden there. */}
        <Button type="button" variant="outline" className="h-11 md:hidden" disabled={busy || room <= 0} onClick={() => cameraInput.current?.click()}>
          <Camera aria-hidden /> Take photo
        </Button>
        <Button type="button" variant="outline" className="h-11" disabled={busy || room <= 0} onClick={() => galleryInput.current?.click()}>
          <ImagePlus aria-hidden /> Choose photo
        </Button>
        <input ref={cameraInput} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={handleFiles} />
        <input ref={galleryInput} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={handleFiles} />
      </div>
      <p className="text-xs text-muted-foreground">
        {photos.length}/{MAX_PHOTOS} photos · shrunk on this device before upload
      </p>
    </div>
  )
}

/** Shows a Blob that only exists in memory, through a temporary blob: URL. Also used for photos waiting in the offline queue. */
export function BlobImage({ blob, alt }: { blob: Blob; alt: string }) {
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (img.current) img.current.src = url
    return () => URL.revokeObjectURL(url) // free the memory when the photo is removed or the page closes
  }, [blob])
  return <img ref={img} alt={alt} className="aspect-square w-full rounded-lg border object-cover" />
}
