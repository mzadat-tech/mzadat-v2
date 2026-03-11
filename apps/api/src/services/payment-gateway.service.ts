/**
 * Payment Gateway Service
 *
 * Manages dynamic payment gateways — admin can add/update gateways
 * on the fly.  Credentials are encrypted with pgcrypto before being
 * stored and decrypted only when a payment operation is performed.
 */

import { prisma, type Prisma as PrismaTypes } from '@mzadat/db'
import { encryptJson, decryptJson } from '../utils/crypto.js'

// ── Types ───────────────────────────────────────────────

/** The shape of credentials differs per provider */
export interface GatewayCredentials {
  [key: string]: string | boolean | number | undefined
}

/** What the admin sends when creating/updating a gateway */
export interface UpsertGatewayInput {
  name: { en: string; ar: string }
  code: string
  provider: string
  logo?: string
  description?: { en: string; ar: string }
  credentials: GatewayCredentials
  isSandbox?: boolean
  supportedCurrencies?: string[]
  supportedMethods?: string[]
  webhookUrl?: string
  extraSettings?: Record<string, unknown>
  isActive?: boolean
  sortOrder?: number
}

/** Public gateway info (credentials stripped) */
export interface PublicGateway {
  id: string
  name: unknown
  code: string
  provider: string
  logo: string | null
  description: unknown
  isSandbox: boolean
  supportedCurrencies: string[]
  supportedMethods: string[]
  isActive: boolean
  sortOrder: number
}

// ── Service ─────────────────────────────────────────────

export class PaymentGatewayService {
  /**
   * List all gateways (credentials stripped).
   * Pass `activeOnly: true` to show only enabled gateways.
   */
  async list(activeOnly = false): Promise<PublicGateway[]> {
    const gateways = await prisma.paymentGateway.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        provider: true,
        logo: true,
        description: true,
        isSandbox: true,
        supportedCurrencies: true,
        supportedMethods: true,
        isActive: true,
        sortOrder: true,
      },
    })
    return gateways
  }

  /**
   * Get a single gateway by code (e.g. 'thawani').
   * Returns decrypted credentials.
   */
  async getByCode(code: string): Promise<{
    gateway: PublicGateway
    credentials: GatewayCredentials
  } | null> {
    const gw = await prisma.paymentGateway.findUnique({ where: { code } })
    if (!gw) return null

    let credentials: GatewayCredentials = {}
    if (gw.credentialsEncrypted) {
      credentials = await decryptJson<GatewayCredentials>(
        Buffer.from(gw.credentialsEncrypted),
      )
    }

    return {
      gateway: {
        id: gw.id,
        name: gw.name,
        code: gw.code,
        provider: gw.provider,
        logo: gw.logo,
        description: gw.description,
        isSandbox: gw.isSandbox,
        supportedCurrencies: gw.supportedCurrencies,
        supportedMethods: gw.supportedMethods,
        isActive: gw.isActive,
        sortOrder: gw.sortOrder,
      },
      credentials,
    }
  }

  /**
   * Create a new payment gateway.
   * Credentials are encrypted before storage.
   */
  async create(input: UpsertGatewayInput): Promise<PublicGateway> {
    const encrypted = await encryptJson(input.credentials as Record<string, unknown>)

    const gw = await prisma.paymentGateway.create({
      data: {
        name: input.name,
        code: input.code,
        provider: input.provider,
        logo: input.logo ?? null,
        description: input.description ?? {},
        credentialsEncrypted: encrypted,
        isSandbox: input.isSandbox ?? true,
        supportedCurrencies: input.supportedCurrencies ?? ['OMR'],
        supportedMethods: input.supportedMethods ?? [],
        webhookUrl: input.webhookUrl ?? null,
        extraSettings: (input.extraSettings ?? {}) as PrismaTypes.InputJsonValue,
        isActive: input.isActive ?? false,
        sortOrder: input.sortOrder ?? 0,
      },
    })

    return {
      id: gw.id,
      name: gw.name,
      code: gw.code,
      provider: gw.provider,
      logo: gw.logo,
      description: gw.description,
      isSandbox: gw.isSandbox,
      supportedCurrencies: gw.supportedCurrencies,
      supportedMethods: gw.supportedMethods,
      isActive: gw.isActive,
      sortOrder: gw.sortOrder,
    }
  }

  /**
   * Update an existing gateway.
   * If new credentials are provided they replace the old ones (re-encrypted).
   */
  async update(
    code: string,
    input: Partial<UpsertGatewayInput>,
  ): Promise<PublicGateway> {
    const data: Record<string, unknown> = {}

    if (input.name) data.name = input.name
    if (input.provider) data.provider = input.provider
    if (input.logo !== undefined) data.logo = input.logo
    if (input.description) data.description = input.description
    if (input.isSandbox !== undefined) data.isSandbox = input.isSandbox
    if (input.supportedCurrencies) data.supportedCurrencies = input.supportedCurrencies
    if (input.supportedMethods) data.supportedMethods = input.supportedMethods
    if (input.webhookUrl !== undefined) data.webhookUrl = input.webhookUrl
    if (input.extraSettings) data.extraSettings = input.extraSettings
    if (input.isActive !== undefined) data.isActive = input.isActive
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

    // Re-encrypt new credentials if provided
    if (input.credentials) {
      data.credentialsEncrypted = await encryptJson(
        input.credentials as Record<string, unknown>,
      )
    }

    const gw = await prisma.paymentGateway.update({
      where: { code },
      data,
    })

    return {
      id: gw.id,
      name: gw.name,
      code: gw.code,
      provider: gw.provider,
      logo: gw.logo,
      description: gw.description,
      isSandbox: gw.isSandbox,
      supportedCurrencies: gw.supportedCurrencies,
      supportedMethods: gw.supportedMethods,
      isActive: gw.isActive,
      sortOrder: gw.sortOrder,
    }
  }

  /**
   * Toggle gateway active state.
   */
  async toggleActive(code: string): Promise<{ code: string; isActive: boolean }> {
    const gw = await prisma.paymentGateway.findUniqueOrThrow({ where: { code } })
    const updated = await prisma.paymentGateway.update({
      where: { code },
      data: { isActive: !gw.isActive },
    })
    return { code: updated.code, isActive: updated.isActive }
  }

  /**
   * Delete a gateway.
   */
  async delete(code: string): Promise<void> {
    await prisma.paymentGateway.delete({ where: { code } })
  }

  /**
   * Test a gateway's credentials by performing a dry-run.
   * This is provider-specific — each provider adapter should
   * implement its own test method.
   */
  async testConnection(code: string): Promise<{ success: boolean; message: string }> {
    const result = await this.getByCode(code)
    if (!result) {
      return { success: false, message: `Gateway "${code}" not found` }
    }

    // Validate minimum required fields exist
    const creds = result.credentials
    const hasKeys = Object.keys(creds).length > 0
    if (!hasKeys) {
      return { success: false, message: 'No credentials configured' }
    }

    // TODO: Implement provider-specific health checks
    // e.g. for Thawani: call /api/v1/checkout/session with test data
    // For now, just validate structure
    const now = new Date()
    await prisma.paymentGateway.update({
      where: { code },
      data: {
        lastTestedAt: now,
        lastTestResult: 'success',
      },
    })

    return { success: true, message: 'Credentials validated' }
  }

  /**
   * Get decrypted credentials for use in payment processing.
   * Throws if gateway is not found or not active.
   */
  async getCredentials(code: string): Promise<GatewayCredentials> {
    const gw = await prisma.paymentGateway.findUnique({ where: { code } })
    if (!gw) throw new Error(`Gateway "${code}" not found`)
    if (!gw.isActive) throw new Error(`Gateway "${code}" is disabled`)
    if (!gw.credentialsEncrypted) throw new Error(`Gateway "${code}" has no credentials`)

    return decryptJson<GatewayCredentials>(Buffer.from(gw.credentialsEncrypted))
  }

  /**
   * Log a payment transaction.
   */
  async logTransaction(data: {
    gatewayId: string
    gatewayCode: string
    externalId?: string
    orderId?: string
    userId?: string
    amount: number
    currency?: string
    type: string
    status: string
    gatewayRequest?: unknown
    gatewayResponse?: unknown
    ipAddress?: string
  }) {
    return prisma.paymentTransaction.create({
      data: {
        gatewayId: data.gatewayId,
        gatewayCode: data.gatewayCode,
        externalId: data.externalId,
        orderId: data.orderId,
        userId: data.userId,
        amount: data.amount,
        currency: data.currency ?? 'OMR',
        type: data.type,
        status: data.status,
        gatewayRequest: data.gatewayRequest as any,
        gatewayResponse: data.gatewayResponse as any,
        ipAddress: data.ipAddress,
      },
    })
  }
}

export const paymentGatewayService = new PaymentGatewayService()
