/**
 * Generic helpers for the API server.
 */

/** Sleep for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Pick only defined (non-undefined) keys from an object */
export function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

/** Calculate pagination offset */
export function paginationOffset(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize
}

/** Calculate total pages */
export function totalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize)
}
