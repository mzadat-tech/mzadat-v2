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
import { prisma, Decimal } from '@mzadat/db'
import { DEFAULT_COMMISSION_RATE, DEFAULT_VAT_RATE, WINNER_PAYMENT_DAYS } from '@mzadat/config'
import { generateOrderNumber as formatOrderNumber } from '../utils/custom-id.js'
import { broadcastAuctionEvent } from '../websocket/broadcaster.js'

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

      broadcastAuctionEvent('auction:no-winner', { productId })
      return { success: true, reason: 'No bids placed — auction closed without winner' }
    }

    // 5. Check reserve price
    if (product.reservePrice && winningBid.amount.lessThan(product.reservePrice)) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'closed' },
      })

      broadcastAuctionEvent('auction:reserve-not-met', {
        productId,
        reservePrice: product.reservePrice.toString(),
        highestBid: winningBid.amount.toString(),
      })
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

    // 7. Calculate order amounts
    const bidAmount = winningBid.amount
    const commissionRate = new Decimal(DEFAULT_COMMISSION_RATE).div(100)
    const vatRate = new Decimal(DEFAULT_VAT_RATE).div(100)
    const commissionAmount = bidAmount.mul(commissionRate)
    const taxAmount = bidAmount.mul(vatRate)
    const totalAmount = bidAmount.add(taxAmount)

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

    // 12. Broadcast winner event
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

    console.log(
      `🏆 Winner processed: Product=${productId}, Winner=${winningBid.user.customId}, Bid=${winningBid.amount}, Order=${orderNumber}`,
    )

    return { success: true, orderId: order.id }
  },
}
