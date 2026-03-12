import { Router, type IRouter } from 'express'
import { paymentGatewayRoutes } from './payment-gateways.js'
import { categoryRoutes } from './categories.js'
import { authRoutes } from './auth.js'
import { auctionRoutes } from './auctions.js'
import { bidRoutes } from './bids.js'
import { groupRoutes } from './groups.js'
import { storeRoutes } from './stores.js'
import { cmsRoutes } from './cms.js'
import { walletRoutes } from './wallet.js'
import { adminWalletRoutes } from './admin-wallet.js'
import { registrationRoutes } from './registrations.js'

const router: IRouter = Router()

// Health / version
router.get('/', (_req, res) => {
  res.json({
    name: 'Mzadat API',
    version: '0.0.1',
    status: 'running',
  })
})

// ── Active routes ───────────────────────────────────────
router.use('/auth', authRoutes)
router.use('/payment-gateways', paymentGatewayRoutes)
router.use('/categories', categoryRoutes)
router.use('/auctions', auctionRoutes)
router.use('/bids', bidRoutes)
router.use('/groups', groupRoutes)
router.use('/stores', storeRoutes)
router.use('/cms', cmsRoutes)
router.use('/wallet', walletRoutes)
router.use('/admin/wallet', adminWalletRoutes)
router.use('/registrations', registrationRoutes)

// Route modules will be registered here as they are built:
// router.use('/users', userRoutes)
// router.use('/products', productRoutes)
// router.use('/auctions', auctionRoutes)
// router.use('/bids', bidRoutes)
// router.use('/groups', groupRoutes)
// router.use('/orders', orderRoutes)
// router.use('/wallet', walletRoutes)
// router.use('/payments', paymentRoutes)
// router.use('/stores', storeRoutes)
// router.use('/categories', categoryRoutes)  ← already active above
// router.use('/blogs', blogRoutes)
// router.use('/support', supportRoutes)
// router.use('/reports', reportRoutes)
// router.use('/media', mediaRoutes)
// router.use('/settings', settingsRoutes)

export { router as routes }
