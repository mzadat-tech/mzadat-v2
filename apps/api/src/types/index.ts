import type { Request, Response } from 'express'

// Placeholder types — expand as Express.d.ts is developed
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface PaginationQuery {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

// Extend Express Request with auth info
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: string
    }
  }
}
