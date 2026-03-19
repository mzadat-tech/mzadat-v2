import { Router, type Response } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { requireRole } from '../middleware/role-guard.js'
import { registrationService } from '../services/registration.service.js'

const router: Router = Router()

router.use(authMiddleware)
router.use(requireRole('admin', 'super_admin'))

// ── GET /admin/orders (registrations) ──────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20)
    const search = req.query.search as string

    const result = await registrationService.adminList(page, pageSize, search)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('Failed to list admin orders/registrations:', err)
    res.status(500).json({ success: false, error: 'Failed to list orders' })
  }
})

// ── GET /admin/orders/:id ──────────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const registration = await registrationService.adminGetById(id)
    if (!registration) {
      res.status(404).json({ success: false, error: 'Order not found' })
      return
    }

    res.json({ success: true, data: registration })
  } catch (err) {
    console.error('Failed to get admin order details:', err)
    res.status(500).json({ success: false, error: 'Failed to get order details' })
  }
})

export { router as adminOrderRoutes }
