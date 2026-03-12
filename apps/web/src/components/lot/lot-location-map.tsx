'use client'

import { MapPin, Navigation, ExternalLink } from 'lucide-react'
import { Button } from '@mzadat/ui'

interface LotLocationMapProps {
  location: string
  isAr: boolean
}

/**
 * Themed Google Maps embed with gradient fade overlay.
 * Extracts coordinates from the location string (format: "lat,lng" or plain text).
 * Falls back to location name geocoding via Maps embed API.
 * Gray-styled map with faded edges to focus attention on the pin.
 */
export function LotLocationMap({ location, isAr }: LotLocationMapProps) {
  if (!location) return null

  // Try to parse coordinates from location string (e.g. "23.5880,58.3829")
  const coordMatch = location.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/)
  const hasCoords = !!coordMatch
  const lat = coordMatch ? coordMatch[1] : null
  const lng = coordMatch ? coordMatch[2] : null

  // Build embed URL with gray style using Maps Embed API
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const embedUrl = hasCoords
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15&maptype=roadmap`
    : `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(location)}&zoom=14&maptype=roadmap`

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`

  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(location)}`

  return (
    <div className="relative mt-1 overflow-hidden rounded-2xl">
      {/* Map Container */}
      <div className="relative h-[280px] w-full overflow-hidden rounded-2xl bg-slate-100 sm:h-[320px]">
        {/* Static Map Fallback (used when no API key - shows a styled placeholder) */}
        {!apiKey ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="relative">
                <div className="absolute -inset-4 animate-ping rounded-full bg-primary-500/10" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-500/30">
                  <MapPin className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500">{location}</p>
            </div>
          </div>
        ) : (
          <iframe
            src={embedUrl}
            className="h-full w-full border-0 grayscale-[0.6] saturate-[0.7] contrast-[1.1]"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Lot Location"
          />
        )}

        {/* Gradient fade on all edges — signature Mzadat aesthetic */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl">
          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/80 to-transparent" />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/90 to-transparent" />
          {/* Left fade */}
          <div className="absolute inset-y-0 start-0 w-16 bg-gradient-to-r from-white/70 to-transparent" />
          {/* Right fade */}
          <div className="absolute inset-y-0 end-0 w-16 bg-gradient-to-l from-white/70 to-transparent" />
          {/* Corner accents */}
          <div className="absolute start-0 top-0 h-24 w-24 bg-gradient-to-br from-white/90 to-transparent" />
          <div className="absolute end-0 top-0 h-24 w-24 bg-gradient-to-bl from-white/90 to-transparent" />
          <div className="absolute bottom-0 start-0 h-24 w-24 bg-gradient-to-tr from-white/95 to-transparent" />
          <div className="absolute bottom-0 end-0 h-24 w-24 bg-gradient-to-tl from-white/95 to-transparent" />
          {/* Inner ring glow */}
          <div className="absolute inset-4 rounded-xl ring-1 ring-white/20" />
        </div>

        {/* Floating pin indicator in center */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Pulse ring */}
            <div className="absolute -inset-3 animate-[ping_2s_ease-in-out_infinite] rounded-full bg-primary-500/20" />
            <div className="absolute -inset-1.5 rounded-full bg-primary-500/10" />
          </div>
        </div>

        {/* Action buttons overlaid on map */}
        <div className="absolute bottom-4 start-4 end-4 z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <MapPin className="h-4 w-4 text-primary-600" />
            <span className="max-w-[180px] truncate text-sm font-medium text-slate-700 sm:max-w-[260px]">
              {location}
            </span>
          </div>
          <div className="flex gap-2">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-transform hover:scale-105"
            >
              <Navigation className="h-4 w-4" />
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
