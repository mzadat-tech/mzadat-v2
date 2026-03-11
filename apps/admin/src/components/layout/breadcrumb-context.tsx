'use client'

import { createContext, useContext, useMemo, useState } from 'react'

interface BreadcrumbContextValue {
  override: string[] | null
  setOverride: (items: string[] | null) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<string[] | null>(null)

  const value = useMemo(
    () => ({ override, setOverride }),
    [override],
  )

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbOverride() {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumbOverride must be used within BreadcrumbProvider')
  }
  return context
}
