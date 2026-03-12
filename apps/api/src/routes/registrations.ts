/**
 * Registration Routes
 *
 * POST   /api/registrations              — Register for a group (pay deposit)
 * GET    /api/registrations/my            — User's registrations
 * GET    /api/registrations/check/:groupId — Check if registered for a group
 * GET    /api/registrations/:id           — Get registration details
 * GET    /api/registrations/:id/receipt   — Download PDF receipt
 */

import { Router, type Response } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { registrationService, RegistrationError } from '../services/registration.service.js'

const router:Router = Router()

// All routes require authentication
router.use(authMiddleware)

// ── POST /registrations — Register for a group ──────────
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId, paymentMethod = 'wallet' } = req.body as {
      groupId: string
      paymentMethod?: string
    }

    if (!groupId) {
      res.status(400).json({ success: false, error: 'groupId is required' })
      return
    }

    const result = await registrationService.register({
      userId: req.userId!,
      groupId,
      paymentMethod: paymentMethod as 'wallet',
    })

    res.status(201).json({
      success: true,
      message: result.isVipFree
        ? 'VIP registration completed — no deposit required!'
        : 'Registration successful! You can now bid on all lots in this group.',
      data: result,
    })
  } catch (err) {
    if (err instanceof RegistrationError) {
      res.status(err.statusCode).json({ success: false, error: err.message })
      return
    }
    console.error('Registration failed:', err)
    res.status(500).json({ success: false, error: 'Registration failed' })
  }
})

// ── GET /registrations/my — User's registrations ────────
router.get('/my', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20)

    const result = await registrationService.listByUser(req.userId!, page, pageSize)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('Failed to list registrations:', err)
    res.status(500).json({ success: false, error: 'Failed to list registrations' })
  }
})

// ── GET /registrations/check/:groupId — Check registration ──
router.get('/check/:groupId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.groupId as string
    const result = await registrationService.isRegistered(req.userId!, groupId)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Failed to check registration:', err)
    res.status(500).json({ success: false, error: 'Failed to check registration' })
  }
})

// ── GET /registrations/checkout/:groupId — Checkout data ──
router.get('/checkout/:groupId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.groupId as string
    const data = await registrationService.getCheckoutData(groupId, req.userId!)
    if (!data) {
      res.status(404).json({ success: false, error: 'Group not found' })
      return
    }
    res.json({ success: true, data })
  } catch (err) {
    console.error('Failed to get checkout data:', err)
    res.status(500).json({ success: false, error: 'Failed to get checkout data' })
  }
})

// ── GET /registrations/:id — Registration details ────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const regId = req.params.id as string
    const registration = await registrationService.getById(regId)
    if (!registration) {
      res.status(404).json({ success: false, error: 'Registration not found' })
      return
    }

    // Ensure user can only view their own (unless admin)
    if (registration.userId !== req.userId && req.userRole !== 'admin' && req.userRole !== 'super_admin') {
      res.status(403).json({ success: false, error: 'Access denied' })
      return
    }

    res.json({ success: true, data: registration })
  } catch (err) {
    console.error('Failed to get registration:', err)
    res.status(500).json({ success: false, error: 'Failed to get registration' })
  }
})

// ── GET /registrations/:id/receipt — Receipt data (JSON) ──
router.get('/:id/receipt', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const regId = req.params.id as string

    const registration = await registrationService.getById(regId)
    if (!registration) {
      res.status(404).json({ success: false, error: 'Registration not found' })
      return
    }

    // Ensure user can only access their own (unless admin)
    if (registration.userId !== req.userId && req.userRole !== 'admin' && req.userRole !== 'super_admin') {
      res.status(403).json({ success: false, error: 'Access denied' })
      return
    }

    res.json({ success: true, data: registration })
  } catch (err) {
    console.error('Failed to get receipt data:', err)
    res.status(500).json({ success: false, error: 'Failed to get receipt data' })
  }
})

export { router as registrationRoutes }
