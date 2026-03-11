// @mzadat/db — Database package barrel export
export { prisma } from './client'
export { pool, query, queryOne, warmPool } from './pool'
export { PrismaClient, Prisma } from '@prisma/client'
export { Decimal } from '@prisma/client/runtime/library'
export type { Prisma as PrismaTypes } from '@prisma/client'

// Model types via Prisma namespace (Prisma 6.x pattern)
import type { Prisma as P } from '@prisma/client'

export type Profile = P.ProfileGetPayload<{}>
export type Store = P.StoreGetPayload<{}>
export type Category = P.CategoryGetPayload<{}>
export type Group = P.GroupGetPayload<{}>
export type Product = P.ProductGetPayload<{}>
export type ProductGallery = P.ProductGalleryGetPayload<{}>
export type ProductSpecification = P.ProductSpecificationGetPayload<{}>
export type ProductReview = P.ProductReviewGetPayload<{}>
export type Order = P.OrderGetPayload<{}>
export type BidHistory = P.BidHistoryGetPayload<{}>
export type DeletedBidLog = P.DeletedBidLogGetPayload<{}>
export type WalletTransaction = P.WalletTransactionGetPayload<{}>
export type BankDeposit = P.BankDepositGetPayload<{}>
export type Withdrawal = P.WithdrawalGetPayload<{}>
export type SupportTicket = P.SupportTicketGetPayload<{}>
export type TicketReply = P.TicketReplyGetPayload<{}>
export type TicketAttachment = P.TicketAttachmentGetPayload<{}>
export type PaymentGateway = P.PaymentGatewayGetPayload<{}>
export type PaymentTransaction = P.PaymentTransactionGetPayload<{}>
export type PaymentMethod = P.PaymentMethodGetPayload<{}>
export type Currency = P.CurrencyGetPayload<{}>
export type Notification = P.NotificationGetPayload<{}>
export type AuditLog = P.AuditLogGetPayload<{}>
export type Watchlist = P.WatchlistGetPayload<{}>
export type UserPaymentInfo = P.UserPaymentInfoGetPayload<{}>
export type Country = P.CountryGetPayload<{}>
export type State = P.StateGetPayload<{}>
export type City = P.CityGetPayload<{}>
export type CorporateDomain = P.CorporateDomainGetPayload<{}>

// CMS tables (Blog, Widget, Menu, etc.) are native PostgreSQL tables
// queried via raw pg in apps/api/src/services/cms.service.ts
// Migration: prisma/migrations/20260306100000_add_cms_tables/migration.sql

// Re-export enums
export * from './enums'
