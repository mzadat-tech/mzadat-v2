import type { Request, Response, NextFunction } from 'express'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Express middleware that validates a route param is a valid UUID.
 * Returns 400 immediately if the param is not a UUID, preventing
 * Prisma from throwing a 500 on invalid UUID input.
 *
 * @param paramName — name of the route param (default: 'id')
 */
export function validateUUID(paramName = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName]
    if (!value || !UUID_RE.test(value as string)) {
      res.status(400).json({
        success: false,
        error: `Invalid ${paramName}: must be a valid UUID`,
      })
      return
    }
    next()
  }
}
