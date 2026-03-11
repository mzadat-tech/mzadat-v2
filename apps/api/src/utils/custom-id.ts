/**
 * Generate a custom ID with a prefix and zero-padded number.
 * @example generateCustomId('C', 1)  → 'C0001'
 * @example generateCustomId('MC', 42) → 'MC0042'
 */
export function generateCustomId(prefix: string, sequence: number, padding = 4): string {
  return `${prefix}${String(sequence).padStart(padding, '0')}`
}

/**
 * Generate an order number.
 * @example generateOrderNumber(2026, 1) → 'MZD-2026-0001'
 */
export function generateOrderNumber(year: number, sequence: number): string {
  return `MZD-${year}-${String(sequence).padStart(4, '0')}`
}

/**
 * Generate a ticket number.
 * @example generateTicketNumber(1) → 'TKT-0001'
 */
export function generateTicketNumber(sequence: number): string {
  return `TKT-${String(sequence).padStart(4, '0')}`
}

/**
 * Generate a wallet transaction reference number.
 * @example generateWalletTxRef(2026, 1) → 'WTX-2026-000001'
 */
export function generateWalletTxRef(year: number, sequence: number): string {
  return `WTX-${year}-${String(sequence).padStart(6, '0')}`
}
