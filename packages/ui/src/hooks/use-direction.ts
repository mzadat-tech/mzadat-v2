'use client'

import * as React from 'react'

/**
 * Hook to detect if the current direction is RTL.
 * Reads from the closest ancestor with a `dir` attribute, or defaults to `ltr`.
 */
export function useDirection() {
  const [dir, setDir] = React.useState<'ltr' | 'rtl'>('ltr')

  React.useEffect(() => {
    const htmlDir = document.documentElement.getAttribute('dir') as 'ltr' | 'rtl' | null
    setDir(htmlDir ?? 'ltr')
  }, [])

  return dir
}
