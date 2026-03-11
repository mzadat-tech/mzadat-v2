/**
 * WebSocket Server for Live Auctions
 *
 * Rooms:
 *  - `auction:{productId}` — subscribe to a specific auction's events
 *  - `group:{groupId}` — subscribe to all events for a group's lots
 *  - `dashboard` — admin dashboard (receives all events)
 *
 * Client messages (JSON):
 *   { "type": "subscribe", "room": "auction:uuid" }
 *   { "type": "unsubscribe", "room": "auction:uuid" }
 *   { "type": "ping" }
 *
 * Server messages (JSON):
 *   { "type": "pong" }
 *   { "type": "<event>", "payload": { ... } }
 */
import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HttpServer } from 'http'
import { onAuctionEvent } from './broadcaster.js'

// ── Types ────────────────────────────────────────────────────

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

export type AuctionEventPayload = Record<string, unknown>

interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping'
  room?: string
}

// ── Room management ──────────────────────────────────────────

const rooms = new Map<string, Set<WebSocket>>()

function joinRoom(ws: WebSocket, room: string) {
  if (!rooms.has(room)) rooms.set(room, new Set())
  rooms.get(room)!.add(ws)
}

function leaveRoom(ws: WebSocket, room: string) {
  rooms.get(room)?.delete(ws)
  if (rooms.get(room)?.size === 0) rooms.delete(room)
}

function leaveAllRooms(ws: WebSocket) {
  for (const [room, clients] of rooms) {
    clients.delete(ws)
    if (clients.size === 0) rooms.delete(room)
  }
}

function sendToRoom(room: string, data: string) {
  const clients = rooms.get(room)
  if (!clients) return
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}

// ── Setup ────────────────────────────────────────────────────

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  console.log('🔌 WebSocket server ready at /ws')

  // Wire up the broadcaster → WebSocket rooms
  onAuctionEvent((event, payload) => {
    const message = JSON.stringify({ type: event, payload })

    // Always send to dashboard room
    sendToRoom('dashboard', message)

    // Send to specific auction room
    const productId = (payload as any).productId as string | undefined
    if (productId) {
      sendToRoom(`auction:${productId}`, message)
    }

    // Send to group room
    const groupId = (payload as any).groupId as string | undefined
    if (groupId) {
      sendToRoom(`group:${groupId}`, message)
    }
  })

  wss.on('connection', (ws) => {
    // Auto-join pings to keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping()
      }
    }, 30000)

    ws.on('message', (raw) => {
      try {
        const msg: ClientMessage = JSON.parse(raw.toString())

        switch (msg.type) {
          case 'subscribe':
            if (msg.room) {
              joinRoom(ws, msg.room)
            }
            break

          case 'unsubscribe':
            if (msg.room) {
              leaveRoom(ws, msg.room)
            }
            break

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }))
            break
        }
      } catch {
        // Ignore malformed messages
      }
    })

    ws.on('close', () => {
      clearInterval(pingInterval)
      leaveAllRooms(ws)
    })

    ws.on('error', () => {
      clearInterval(pingInterval)
      leaveAllRooms(ws)
    })

    // Welcome message
    ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }))
  })

  return wss
}

/** Get current room stats for admin dashboard. */
export function getWebSocketStats() {
  const roomStats: Record<string, number> = {}
  for (const [room, clients] of rooms) {
    roomStats[room] = clients.size
  }
  return {
    totalRooms: rooms.size,
    totalConnections: [...rooms.values()].reduce((sum, s) => sum + s.size, 0),
    rooms: roomStats,
  }
}
