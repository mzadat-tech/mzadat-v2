import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from './auth.js'

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
