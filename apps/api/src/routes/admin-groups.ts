/**
 * Admin Group Routes
 *
 * POST /admin/groups/:id/force-close — Force-close all lots in a group, process winners, close group
 */
import { Router, type Response } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { requireRole } from '../middleware/role-guard.js'
import { validateUUID } from '../middleware/validate-uuid.js'
import { forceCloseGroup } from '../services/auction.service.js'
import { prisma } from '@mzadat/db'

const router: Router = Router()

router.use(authMiddleware)
router.use(requireRole('admin', 'super_admin'))

/**
 * POST /admin/groups/:id/force-close
 *
 * Force-close a group: immediately end all active lots,
 * declare winners, refund non-winners, and close the group.
 */
router.post('/:id/force-close', validateUUID(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id as string

    // Pre-flight: count lots that will be affected
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, status: true },
    })

    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' })
      return
    }

    if (group.status === 'closed') {
      res.status(400).json({ success: false, error: 'Group is already closed' })
      return
    }

    const result = await forceCloseGroup(groupId)

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error })
      return
    }

    res.json({
      success: true,
      data: {
        closedLots: result.closedLots,
        alreadyClosed: result.alreadyClosed,
      },
    })
  } catch (err) {
    console.error('Failed to force-close group:', err)
    res.status(500).json({ success: false, error: 'Failed to close group' })
  }
})

/**
 * GET /admin/groups/:id/close-preview
 *
 * Preview the impact of force-closing a group — shows how many lots will be closed, etc.
 */
router.get('/:id/close-preview', validateUUID(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id as string

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, status: true },
    })

    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' })
      return
    }

    const [activeLots, closedLots, totalRegistrations] = await Promise.all([
      prisma.product.count({
        where: { groupId, status: { in: ['published', 'pending'] }, deletedAt: null },
      }),
      prisma.product.count({
        where: { groupId, status: 'closed', deletedAt: null },
      }),
      prisma.auctionRegistration.count({
        where: { groupId, status: 'active' },
      }),
    ])

    res.json({
      success: true,
      data: {
        groupStatus: group.status,
        activeLots,
        closedLots,
        totalLots: activeLots + closedLots,
        activeRegistrations: totalRegistrations,
      },
    })
  } catch (err) {
    console.error('Failed to get close preview:', err)
    res.status(500).json({ success: false, error: 'Failed to get preview' })
  }
})

export { router as adminGroupRoutes }
