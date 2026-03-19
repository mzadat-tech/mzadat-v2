// @mzadat/email — Barrel export

// Renderer (used by API email worker)
export { renderEmail, type EmailTemplateName } from './renderer'

// Components
export { EmailLayout, DetailTable, brand, styles, t } from './components/layout'

// Templates
export { WelcomeEmail } from './templates/welcome'
export { AuctionWonEmail } from './templates/auction-won'
export { AuctionLostEmail } from './templates/auction-lost'
export { RegistrationConfirmedEmail } from './templates/registration-confirmed'
export { DepositRefundEmail } from './templates/deposit-refund'
export { WalletDepositApprovedEmail } from './templates/wallet-deposit-approved'
export { WalletDepositRejectedEmail } from './templates/wallet-deposit-rejected'
export { WalletCreditedEmail } from './templates/wallet-credited'
export { PaymentReminderEmail } from './templates/payment-reminder'
export { OutbidEmail } from './templates/outbid'
