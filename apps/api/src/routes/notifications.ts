/**
 * Notification Routes
 *
 * User endpoints:
 *  GET    /notifications          — List notifications (paginated, filterable)
 *  GET    /notifications/unread-count — Unread count
 *  PATCH  /notifications/:id/read — Mark one as read
 *  PATCH  /notifications/read-all — Mark all as read
 *  DELETE /notifications/:id      — Delete one
 *
 * Admin endpoints:
 *  GET    /notifications/admin    — List admin notifications
 */

import { Router, type IRouter, type Response } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { requireRole } from '../middleware/role-guard.js'
import { validate } from '../middleware/validate.js'
import { notificationListSchema } from '@mzadat/validators'
import { notificationService } from '../services/notification.service.js'
import { registerToken, removeToken } from '../services/fcm.service.js'

const router: IRouter = Router()

// All routes require auth
router.use(authMiddleware)

// ── GET /notifications ──────────────────────────────────
// List current user's notifications with pagination & filters
router.get('/', validate(notificationListSchema, 'query'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const params = (req as any).validated?.query ?? req.query
    const result = await notificationService.list({
      userId: req.userId!,
      isRead: params.isRead,
      type: params.type,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    })
    res.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Failed to list notifications:', error)
    res.status(500).json({ success: false, error: 'Failed to list notifications' })
  }
})

// ── GET /notifications/unread-count ─────────────────────
// Get unread notification count for badge display
router.get('/unread-count', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId!)
    res.json({ success: true, data: { count } })
  } catch (error: any) {
    console.error('Failed to get unread count:', error)
    res.status(500).json({ success: false, error: 'Failed to get unread count' })
  }
})

// ── PATCH /notifications/read-all ───────────────────────
// Mark all notifications as read (must be before /:id routes)
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await notificationService.markAllAsRead(req.userId!)
    res.json({ success: true, data: { markedRead: count } })
  } catch (error: any) {
    console.error('Failed to mark all as read:', error)
    res.status(500).json({ success: false, error: 'Failed to mark all as read' })
  }
})

// ── PATCH /notifications/:id/read ───────────────────────
// Mark a single notification as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const found = await notificationService.markAsRead(req.params.id as string, req.userId!)
    if (!found) {
      res.status(404).json({ success: false, error: 'Notification not found' })
      return
    }
    res.json({ success: true, message: 'Notification marked as read' })
  } catch (error: any) {
    console.error('Failed to mark as read:', error)
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' })
  }
})

// ── DELETE /notifications/:id ───────────────────────────
// Delete a single notification
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const found = await notificationService.delete(req.params.id as string, req.userId!)
    if (!found) {
      res.status(404).json({ success: false, error: 'Notification not found' })
      return
    }
    res.json({ success: true, message: 'Notification deleted' })
  } catch (error: any) {
    console.error('Failed to delete notification:', error)
    res.status(500).json({ success: false, error: 'Failed to delete notification' })
  }
})

// ╔═══════════════════════════════════════════════════════╗
// ║  ADMIN ENDPOINTS                                      ║
// ╚═══════════════════════════════════════════════════════╝

// ── GET /notifications/admin ────────────────────────────
// List admin notifications (admin types only)
router.get('/admin', requireRole('admin', 'super_admin'), validate(notificationListSchema, 'query'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const params = (req as any).validated?.query ?? req.query
    const result = await notificationService.list({
      userId: req.userId!,
      isRead: params.isRead,
      type: params.type,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    })
    res.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Failed to list admin notifications:', error)
    res.status(500).json({ success: false, error: 'Failed to list admin notifications' })
  }
})

// ╔═══════════════════════════════════════════════════════╗
// ║  FCM TOKEN ENDPOINTS                                  ║
// ╚═══════════════════════════════════════════════════════╝

// ── POST /notifications/fcm-token ───────────────────────
// Register a device FCM token for the authenticated user
router.post('/fcm-token', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body as { token?: string }
    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, error: 'token is required' })
      return
    }
    await registerToken(req.userId!, token)
    res.json({ success: true })
  } catch (error: any) {
    console.error('Failed to register FCM token:', error)
    res.status(500).json({ success: false, error: 'Failed to register FCM token' })
  }
})

// ── DELETE /notifications/fcm-token ─────────────────────
// Remove a device FCM token (call on logout)
router.delete('/fcm-token', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body as { token?: string }
    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, error: 'token is required' })
      return
    }
    await removeToken(token)
    res.json({ success: true })
  } catch (error: any) {
    console.error('Failed to remove FCM token:', error)
    res.status(500).json({ success: false, error: 'Failed to remove FCM token' })
  }
})

export { router as notificationRoutes }
