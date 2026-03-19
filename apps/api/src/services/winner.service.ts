/**
 * Winner Service
 *
 * Determines the auction winner and creates the winning order.
 *
 * Flow:
 *  1. Find the highest bid for the product
 *  2. Mark it as isWinning = true
 *  3. Create an Order of type 'bid' with status 'win'
 *  4. Notify the winner (via broadcast + future email)
 */
import { prisma, Decimal, pool, queryOne } from '@mzadat/db'
import { DEFAULT_COMMISSION_RATE, DEFAULT_VAT_RATE, WINNER_PAYMENT_DAYS } from '@mzadat/config'
import { generateOrderNumber as formatOrderNumber, generateWalletTxRef } from '../utils/custom-id.js'
import { broadcastAuctionEvent } from '../websocket/broadcaster.js'
import { notify } from './notification.service.js'
import { emailService } from './email.service.js'

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  return key
}

async function nextWalletTxRef(client: any): Promise<string> {
  const result = await client.query(`SELECT nextval('wallet_tx_ref_seq')`)
  const year = new Date().getFullYear()
  return generateWalletTxRef(year, parseInt(result.rows[0].nextval, 10))
}

/**
 * Refund registration deposits for all non-winners in the group.
 * If winnerUserId is null, every paid participant is refunded (no-bids / reserve-not-met).
 * Each refund runs in its own transaction so a single failure doesn't block the rest.
 */
async function refundNonWinnerDeposits(groupId: string, winnerUserId: string | null): Promise<void> {
  const registrations = await pool.query<{
    id: string
    user_id: string
    total_amount: string
    wallet_tx_id: string
  }>(
    `SELECT id, user_id, total_amount::text, wallet_tx_id
     FROM auction_registrations
     WHERE group_id = $1
       AND status = 'active'
       AND is_vip_free = false
       AND wallet_tx_id IS NOT NULL
       ${winnerUserId ? 'AND user_id != $2' : ''}`,
    winnerUserId ? [groupId, winnerUserId] : [groupId],
  )

  if (registrations.rows.length === 0) return

  const encKey = getEncryptionKey()

  for (const reg of registrations.rows) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Idempotency guard — re-check status under lock
      const check = await client.query(
        `SELECT status FROM auction_registrations WHERE id = $1 FOR UPDATE`,
        [reg.id],
      )
      if (check.rows[0]?.status !== 'active') {
        await client.query('ROLLBACK')
        continue
      }

      const amount = parseFloat(reg.total_amount)
      const txRef = await nextWalletTxRef(client)

      // Release wallet transaction
      await client.query(
        `INSERT INTO wallet_transactions (
           reference_number, user_id, type, status, amount, total_amount,
           payment_method, currency, description, amount_encrypted
         ) VALUES (
           $1, $2, 'release'::"WalletTxType", 'completed'::"WalletTxStatus", $3::numeric, $3::numeric,
           'wallet', 'OMR', $4,
           pgp_sym_encrypt($3::text, $5)
         )`,
        [txRef, reg.user_id, amount, 'Auction deposit refund — non-winner release', encKey],
      )

      // Credit balance back
      await client.query(
        `UPDATE profiles
         SET wallet_balance = wallet_balance + $1,
             wallet_balance_encrypted = pgp_sym_encrypt((wallet_balance + $1)::text, $3),
             updated_at = NOW()
         WHERE id = $2`,
        [amount, reg.user_id, encKey],
      )

      // Mark registration as refunded
      await client.query(
        `UPDATE auction_registrations SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [reg.id],
      )

      // Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'refund', 'auction_registration', $2, $3)`,
        [
          reg.user_id,
          reg.id,
          JSON.stringify({ amount, txRef, reason: 'auction_ended_non_winner' }),
        ],
      )

      await client.query('COMMIT')
      console.log(`💸 Deposit refunded: Registration=${reg.id}, User=${reg.user_id}, Amount=${amount}`)

      // Notify user about the refund
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      })
      const gName = group?.name as Record<string, string> | null
      notify.depositRefund(
        reg.user_id,
        amount.toFixed(3),
        { en: gName?.en ?? '', ar: gName?.ar ?? '' },
        groupId,
      ).catch((e) => console.error('Notification error (deposit refund):', e))

      // Email: deposit refund
      queryOne<{ email: string; first_name: string }>(
        `SELECT email, first_name FROM profiles WHERE id = $1`, [reg.user_id],
      ).then((u) => {
        if (u?.email) {
          emailService.sendDepositRefund({
            to: u.email,
            locale: 'en',
            firstName: u.first_name,
            amount: amount.toFixed(3),
            groupName: { en: gName?.en ?? '', ar: gName?.ar ?? '' },
            reason: 'non_winner',
          })
        }
      }).catch((e) => console.error('Email error (deposit refund):', e))
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`❌ Failed to refund deposit for registration ${reg.id}:`, err)
    } finally {
      client.release()
    }
  }
}

/** Generate the next order number: MZD-YYYY-NNNN */
async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `MZD-${year}-`
  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  })
  const seq = lastOrder ? parseInt(lastOrder.orderNumber.split('-').pop() || '0', 10) + 1 : 1
  return formatOrderNumber(year, seq)
}

export const winnerService = {
  /**
   * Process the winner for a closed auction.
   * Idempotent — if a winning order already exists, does nothing.
   */
  async processWinner(productId: string): Promise<{ success: boolean; orderId?: string; reason?: string }> {
    // 1. Load the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        slug: true,
        name: true,
        merchantId: true,
        groupId: true,
        currentBid: true,
        bidCount: true,
        reservePrice: true,
        status: true,
        endDate: true,
        saleType: true,
      },
    })

    if (!product) return { success: false, reason: 'Product not found' }
    if (product.saleType !== 'auction') return { success: false, reason: 'Not an auction' }

    // 2. Check if auction has actually ended
    const now = new Date()
    if (product.endDate && now < product.endDate) {
      return { success: false, reason: 'Auction has not ended yet' }
    }

    // 3. Check for existing winning order (idempotency)
    const existingOrder = await prisma.order.findFirst({
      where: { productId, type: 'bid', status: 'win' },
    })
    if (existingOrder) {
      return { success: true, orderId: existingOrder.id, reason: 'Winner already processed' }
    }

    // 4. Find the highest bid
    const winningBid = await prisma.bidHistory.findFirst({
      where: { productId, deletedAt: null },
      orderBy: { amount: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            customId: true,
            address: true,
            countryId: true,
            stateId: true,
            cityId: true,
          },
        },
      },
    })

    if (!winningBid) {
      // No bids — close without winner
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'closed' },
      })

      // Refund all participants — nobody won
      if (product.groupId) {
        await refundNonWinnerDeposits(product.groupId, null)
      }

      broadcastAuctionEvent('auction:no-winner', { productId })

      // Notify admins
      const pName = product.name as Record<string, string> | null
      notify.adminNoWinner(pName?.en ?? '', productId, 'No bids placed').catch((e) =>
        console.error('Notification error (no-winner admin):', e),
      )

      return { success: true, reason: 'No bids placed — auction closed without winner' }
    }

    // 5. Check reserve price
    if (product.reservePrice && winningBid.amount.lessThan(product.reservePrice)) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'closed' },
      })

      // Refund all participants — reserve not met
      if (product.groupId) {
        await refundNonWinnerDeposits(product.groupId, null)
      }

      broadcastAuctionEvent('auction:reserve-not-met', {
        productId,
        reservePrice: product.reservePrice.toString(),
        highestBid: winningBid.amount.toString(),
      })

      // Notify all bidders that reserve was not met
      const pNameR = product.name as Record<string, string> | null
      const bidders = await prisma.bidHistory.findMany({
        where: { productId, deletedAt: null },
        select: { userId: true },
        distinct: ['userId'],
      })
      for (const b of bidders) {
        notify.reserveNotMet(
          b.userId,
          { en: pNameR?.en ?? '', ar: pNameR?.ar ?? '' },
          productId,
        ).catch((e) => console.error('Notification error (reserve-not-met):', e))
      }
      notify.adminNoWinner(pNameR?.en ?? '', productId, 'Reserve price not met').catch((e) =>
        console.error('Notification error (reserve admin):', e),
      )

      return { success: true, reason: 'Reserve price not met' }
    }

    // 6. Mark the bid as winning
    await prisma.bidHistory.updateMany({
      where: { productId, isWinning: true },
      data: { isWinning: false },
    })
    await prisma.bidHistory.update({
      where: { id: winningBid.id },
      data: { isWinning: true },
    })

    // 7. Calculate order amounts (bid is VAT-inclusive)
    const bidAmount = winningBid.amount
    const commissionRate = new Decimal(DEFAULT_COMMISSION_RATE).div(100)
    const vatRate = new Decimal(DEFAULT_VAT_RATE).div(100)
    const commissionAmount = bidAmount.mul(commissionRate)
    // VAT is included in the bid — extract it: tax = bid - (bid / 1.05)
    const taxAmount = bidAmount.sub(bidAmount.div(new Decimal(1).add(vatRate)))
    const totalAmount = bidAmount

    // 8. Generate order number
    const orderNumber = await nextOrderNumber()

    // 9. Create the winning order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: winningBid.userId,
        productId,
        merchantId: product.merchantId,
        groupId: product.groupId,
        type: 'bid',
        status: 'win',
        paymentStatus: 'unpaid',
        bidAmount,
        amount: bidAmount,
        taxAmount,
        commissionAmount,
        totalAmount,
        billingName: `${winningBid.user.firstName} ${winningBid.user.lastName}`,
        billingEmail: winningBid.user.email,
        billingPhone: winningBid.user.phone,
        billingAddress: winningBid.user.address,
        billingCountryId: winningBid.user.countryId,
        billingStateId: winningBid.user.stateId,
        billingCityId: winningBid.user.cityId,
      },
    })

    // 10. Link the bid to the order
    await prisma.bidHistory.update({
      where: { id: winningBid.id },
      data: { orderId: order.id, orderNumber },
    })

    // 11. Close the product
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'closed' },
    })

    // 12. Refund all non-winner deposits
    if (product.groupId) {
      await refundNonWinnerDeposits(product.groupId, winningBid.userId)
    }

    // 13. Broadcast winner event
    broadcastAuctionEvent('auction:winner', {
      productId,
      groupId: product.groupId,
      orderId: order.id,
      orderNumber,
      winner: {
        id: winningBid.user.id,
        name: `${winningBid.user.firstName} ${winningBid.user.lastName}`,
        customId: winningBid.user.customId,
      },
      winningBid: winningBid.amount.toString(),
      totalAmount: totalAmount.toString(),
    })

    // 14. Notify winner and losing bidders
    const pNameW = product.name as Record<string, string> | null
    const winnerName = `${winningBid.user.firstName} ${winningBid.user.lastName}`

    // Winner notification
    notify.auctionWon(
      winningBid.userId,
      { en: pNameW?.en ?? '', ar: pNameW?.ar ?? '' },
      productId,
      winningBid.amount.toString(),
      orderNumber,
    ).catch((e) => console.error('Notification error (winner):', e))

    // Email: auction won
    emailService.sendAuctionWon({
      to: winningBid.user.email,
      locale: 'en',
      firstName: winningBid.user.firstName,
      productName: { en: pNameW?.en ?? '', ar: pNameW?.ar ?? '' },
      bidAmount: winningBid.amount.toString(),
      taxAmount: taxAmount.toString(),
      totalAmount: totalAmount.toString(),
      orderNumber,
      paymentDays: WINNER_PAYMENT_DAYS,
      productId,
    })

    // Losing bidders
    const losingBidders = await prisma.bidHistory.findMany({
      where: { productId, deletedAt: null, userId: { not: winningBid.userId } },
      select: { userId: true },
      distinct: ['userId'],
    })
    for (const b of losingBidders) {
      notify.auctionLost(
        b.userId,
        { en: pNameW?.en ?? '', ar: pNameW?.ar ?? '' },
        productId,
      ).catch((e) => console.error('Notification error (loser):', e))

      // Email: auction lost
      queryOne<{ email: string; first_name: string }>(
        `SELECT email, first_name FROM profiles WHERE id = $1`, [b.userId],
      ).then((u) => {
        if (u?.email) {
          emailService.sendAuctionLost({
            to: u.email,
            locale: 'en',
            firstName: u.first_name,
            productName: { en: pNameW?.en ?? '', ar: pNameW?.ar ?? '' },
          })
        }
      }).catch((e) => console.error('Email error (auction lost):', e))
    }

    // Admin notification
    notify.adminWinnerProcessed(
      winnerName,
      pNameW?.en ?? '',
      winningBid.amount.toString(),
      productId,
      orderNumber,
    ).catch((e) => console.error('Notification error (admin winner):', e))

    console.log(
      `🏆 Winner processed: Product=${productId}, Winner=${winningBid.user.customId}, Bid=${winningBid.amount}, Order=${orderNumber}`,
    )

    return { success: true, orderId: order.id }
  },
}
