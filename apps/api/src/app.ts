import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { corsOptions } from './config/cors.js'
import { errorHandler } from './middleware/error-handler.js'
import { routes } from './routes/index.js'
import { setupSwagger } from './config/swagger.js'

const app: Express = express()

// Security
app.use(helmet())
app.use(cors(corsOptions))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Logging
app.use(morgan('dev'))

// Swagger docs
setupSwagger(app)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api', routes)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

// Global error handler
app.use(errorHandler)

export { app }
