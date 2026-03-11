'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { signIn } from '@/lib/actions/auth'
import { APP_NAME } from '@mzadat/config'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    formData.set('next', next)

    startTransition(async () => {
      const result = await signIn(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-[360px]">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <Image src="/logo-dark.png" alt={APP_NAME} width={120} height={56} className="mx-auto mb-1 h-20 w-80 object-contain" />
          <h1 className="mt-0.5 text-[13px] text-gray-500">Administration Panel</h1>
        </div>

        {/* Login Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[12px] font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="admin@mzadat.com"
                required
                autoFocus
                autoComplete="email"
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-900 transition-colors placeholder:text-gray-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[12px] font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-900 transition-colors placeholder:text-gray-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex h-9 w-full items-center justify-center rounded-md bg-brand-600 text-[13px] font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                </svg>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          Authorized personnel only
        </p>
      </div>
    </div>
  )
}
