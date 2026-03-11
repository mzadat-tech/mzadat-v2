'use client'

import { Toaster } from '@mzadat/ui/components/sonner'
import { type ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
  locale: string
  direction: 'rtl' | 'ltr'
}

export function Providers({ children, locale, direction }: ProvidersProps) {
  return (
    <>
      {children}
      <Toaster
        position={direction === 'rtl' ? 'top-left' : 'top-right'}
        richColors
        closeButton
        dir={direction}
      />
    </>
  )
}
