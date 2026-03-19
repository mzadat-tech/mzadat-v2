/**
 * Email Renderer
 *
 * Renders email templates to HTML strings. This keeps all JSX/React
 * rendering contained within the @mzadat/email package.
 *
 * Usage (from API worker):
 *   import { renderEmail } from '@mzadat/email'
 *   const html = await renderEmail('auction-won', { firstName: '...', ... })
 */
import { render } from '@react-email/render'
import * as React from 'react'

import { WelcomeEmail } from './templates/welcome'
import { AuctionWonEmail } from './templates/auction-won'
import { AuctionLostEmail } from './templates/auction-lost'
import { RegistrationConfirmedEmail } from './templates/registration-confirmed'
import { DepositRefundEmail } from './templates/deposit-refund'
import { WalletDepositApprovedEmail } from './templates/wallet-deposit-approved'
import { WalletDepositRejectedEmail } from './templates/wallet-deposit-rejected'
import { WalletCreditedEmail } from './templates/wallet-credited'
import { PaymentReminderEmail } from './templates/payment-reminder'
import { OutbidEmail } from './templates/outbid'

// ── Template types ───────────────────────────────────────

export type EmailTemplateName =
  | 'welcome'
  | 'auction-won'
  | 'auction-lost'
  | 'registration-confirmed'
  | 'deposit-refund'
  | 'wallet-deposit-approved'
  | 'wallet-deposit-rejected'
  | 'wallet-credited'
  | 'payment-reminder'
  | 'outbid'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const templateMap: Record<EmailTemplateName, React.FC<any>> = {
  'welcome': WelcomeEmail,
  'auction-won': AuctionWonEmail,
  'auction-lost': AuctionLostEmail,
  'registration-confirmed': RegistrationConfirmedEmail,
  'deposit-refund': DepositRefundEmail,
  'wallet-deposit-approved': WalletDepositApprovedEmail,
  'wallet-deposit-rejected': WalletDepositRejectedEmail,
  'wallet-credited': WalletCreditedEmail,
  'payment-reminder': PaymentReminderEmail,
  'outbid': OutbidEmail,
}

/**
 * Render an email template to an HTML string.
 *
 * @param template - Template name (e.g., 'auction-won')
 * @param props - Template-specific props including `locale`
 * @returns HTML string ready for SMTP sending
 */
export async function renderEmail(
  template: EmailTemplateName,
  props: Record<string, unknown>,
): Promise<string> {
  const Component = templateMap[template]
  if (!Component) throw new Error(`Unknown email template: "${template}"`)

  return render(React.createElement(Component, props))
}
