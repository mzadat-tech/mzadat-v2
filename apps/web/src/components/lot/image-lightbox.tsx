'use client'

import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'

interface ImageLightboxProps {
  images: string[]
  open: boolean
  index: number
  onClose: () => void
}

export function ImageLightbox({ images, open, index, onClose }: ImageLightboxProps) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={images.map((src) => ({ src }))}
      plugins={[Zoom, Counter, Thumbnails]}
      counter={{ container: { style: { top: 'unset', bottom: 0 } } }}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      thumbnails={{ position: 'bottom', width: 80, height: 60 }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
      }}
      animation={{ fade: 200, swipe: 300 }}
    />
  )
}
