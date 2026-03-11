/**
 * Payment Gateway Routes (Admin-only)
 *
 * Endpoints for managing dynamic payment gateways.
 * All routes require authentication + admin role.
 */

import { Router, type IRouter } from 'express'
import type { Response, NextFunction } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { paymentGatewayService, type UpsertGatewayInput } from '../services/payment-gateway.service.js'

const router: IRouter = Router()

// ── Helpers ─────────────────────────────────────────────

function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
    res.status(403).json({ success: false, error: 'Admin access required' })
    return
  }
  next()
}

// All routes require auth + admin
router.use(authMiddleware)
router.use(requireAdmin)

// ── GET /payment-gateways ───────────────────────────────
// List all gateways (credentials stripped)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true'
    const gateways = await paymentGatewayService.list(activeOnly)
    res.json({ success: true, data: gateways })
  } catch (error) {
    console.error('Failed to list gateways:', error)
    res.status(500).json({ success: false, error: 'Failed to list gateways' })
  }
})

// ── GET /payment-gateways/:code ─────────────────────────
// Get a single gateway by code (with decrypted creds for admin)
router.get('/:code', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await paymentGatewayService.getByCode(req.params.code as string)
    if (!result) {
      res.status(404).json({ success: false, error: 'Gateway not found' })
      return
    }
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to get gateway:', error)
    res.status(500).json({ success: false, error: 'Failed to get gateway' })
  }
})

// ── POST /payment-gateways ──────────────────────────────
// Create a new gateway
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = req.body as UpsertGatewayInput

    if (!input.code || !input.provider || !input.name || !input.credentials) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: code, provider, name, credentials',
      })
      return
    }

    const gateway = await paymentGatewayService.create(input)
    res.status(201).json({ success: true, data: gateway })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: `Gateway with code "${req.body.code}" already exists` })
      return
    }
    console.error('Failed to create gateway:', error)
    res.status(500).json({ success: false, error: 'Failed to create gateway' })
  }
})

// ── PATCH /payment-gateways/:code ───────────────────────
// Update an existing gateway
router.patch('/:code', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = req.body as Partial<UpsertGatewayInput>
    const gateway = await paymentGatewayService.update(req.params.code as string, input)
    res.json({ success: true, data: gateway })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Gateway not found' })
      return
    }
    console.error('Failed to update gateway:', error)
    res.status(500).json({ success: false, error: 'Failed to update gateway' })
  }
})

// ── PATCH /payment-gateways/:code/toggle ────────────────
// Enable or disable a gateway
router.patch('/:code/toggle', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await paymentGatewayService.toggleActive(req.params.code as string)
    res.json({ success: true, data: result })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Gateway not found' })
      return
    }
    console.error('Failed to toggle gateway:', error)
    res.status(500).json({ success: false, error: 'Failed to toggle gateway' })
  }
})

// ── POST /payment-gateways/:code/test ───────────────────
// Test gateway credentials
router.post('/:code/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await paymentGatewayService.testConnection(req.params.code as string)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to test gateway:', error)
    res.status(500).json({ success: false, error: 'Failed to test gateway' })
  }
})

// ── DELETE /payment-gateways/:code ──────────────────────
// Delete a gateway
router.delete('/:code', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await paymentGatewayService.delete(req.params.code as string)
    res.json({ success: true, message: 'Gateway deleted' })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Gateway not found' })
      return
    }
    console.error('Failed to delete gateway:', error)
    res.status(500).json({ success: false, error: 'Failed to delete gateway' })
  }
})

export { router as paymentGatewayRoutes }
