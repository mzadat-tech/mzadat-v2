/**
 * Shared API base URL for client-side code.
 *
 * On the server (SSR / route handlers) we can hit the backend over HTTP directly.
 * In the browser we go through the Next.js rewrite proxy (`/backend-api/…`)
 * so the request stays on the same HTTPS origin — no mixed-content issues.
 */
export const CLIENT_API_BASE =
  typeof window === 'undefined'
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api`
    : '/backend-api'
