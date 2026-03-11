import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source])
      // In Express 5 req.query is a read-only getter, so store parsed
      // query/params on req.body-style writable slots via Object.defineProperty
      if (source === 'query' || source === 'params') {
        ;(req as any).validated = { ...((req as any).validated || {}), [source]: data }
      } else {
        req[source] = data
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
        return
      }
      next(error)
    }
  }
}
