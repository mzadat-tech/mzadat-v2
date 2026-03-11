/**
 * WebSocket Broadcaster
 *
 * Provides a publish/subscribe layer on top of the ws Server so that
 * services & workers can broadcast events without importing the ws
 * instance directly.
 *
 * Events are broadcast to:
 *  - `auction:{productId}` room — per-auction subscribers
 *  - `group:{groupId}` room — per-group subscribers
 *  - `dashboard` room — admin dashboard subscribers (receives all events)
 */

import type { AuctionEventType, AuctionEventPayload } from './server'

// Event listener type
type BroadcastListener = (event: AuctionEventType, payload: AuctionEventPayload) => void

// Simple in-process event bus
const listeners: Set<BroadcastListener> = new Set()

/** Register a listener for all auction events. */
export function onAuctionEvent(listener: BroadcastListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Broadcast an auction event to all registered listeners. */
export function broadcastAuctionEvent(event: AuctionEventType, payload: AuctionEventPayload) {
  for (const listener of listeners) {
    try {
      listener(event, payload)
    } catch (err) {
      console.error('Broadcast listener error:', err)
    }
  }
}
