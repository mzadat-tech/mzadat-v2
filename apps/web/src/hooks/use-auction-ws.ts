'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// ── Types ────────────────────────────────────────────

export type AuctionEventType =
  | 'bid:placed'
  | 'auction:started'
  | 'auction:ended'
  | 'auction:extended'
  | 'auction:winner'
  | 'auction:no-winner'
  | 'auction:reserve-not-met'
  | 'group:started'
  | 'group:ended'

export interface AuctionWsMessage {
  type: AuctionEventType | 'connected' | 'pong'
  payload?: any
  ts?: number
}

export interface BidPayload {
  productId: string
  groupId: string
  bid: {
    id: string
    amount: number
    userId: string
    userName: string
    userCustomId: string
    createdAt: string
  }
  isExtended?: boolean
  newEndDate?: string
}

export interface AuctionEndedPayload {
  productId: string
}

export interface AuctionExtendedPayload {
  productId: string
  newEndDate: string
}

// ── Hook ─────────────────────────────────────────────

interface UseAuctionWsOptions {
  /** Rooms to subscribe to, e.g. ['auction:uuid', 'group:uuid'] */
  rooms: string[]
  /** Called on every message from subscribed rooms */
  onMessage?: (msg: AuctionWsMessage) => void
  /** Called when a bid is placed (convenience shorthand) */
  onBid?: (payload: BidPayload) => void
  /** Called when auction ends */
  onAuctionEnded?: (payload: AuctionEndedPayload) => void
  /** Called when auction is extended (snipe protection) */
  onAuctionExtended?: (payload: AuctionExtendedPayload) => void
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean
}

export function useAuctionWs({
  rooms,
  onMessage,
  onBid,
  onAuctionEnded,
  onAuctionExtended,
  enabled = true,
}: UseAuctionWsOptions) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const mountedRef = useRef(true)

  // Stable callback refs
  const onMessageRef = useRef(onMessage)
  const onBidRef = useRef(onBid)
  const onAuctionEndedRef = useRef(onAuctionEnded)
  const onAuctionExtendedRef = useRef(onAuctionExtended)

  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
  useEffect(() => { onBidRef.current = onBid }, [onBid])
  useEffect(() => { onAuctionEndedRef.current = onAuctionEnded }, [onAuctionEnded])
  useEffect(() => { onAuctionExtendedRef.current = onAuctionExtended }, [onAuctionExtended])

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled || rooms.length === 0) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws'

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setConnected(true)

      // Subscribe to rooms
      for (const room of rooms) {
        ws.send(JSON.stringify({ type: 'subscribe', room }))
      }
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const msg: AuctionWsMessage = JSON.parse(event.data)

        // Dispatch to general handler
        onMessageRef.current?.(msg)

        // Dispatch to specific handlers
        switch (msg.type) {
          case 'bid:placed':
            onBidRef.current?.(msg.payload)
            break
          case 'auction:ended':
            onAuctionEndedRef.current?.(msg.payload)
            break
          case 'auction:extended':
            onAuctionExtendedRef.current?.(msg.payload)
            break
        }
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)

      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 3000)
    }

    ws.onerror = () => {
      // onclose will fire after this
    }
  }, [enabled, rooms])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { connected }
}
