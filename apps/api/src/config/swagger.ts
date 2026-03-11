import type { Express } from 'express'
import swaggerUi from 'swagger-ui-express'

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Mzadat API',
    version: '0.0.1',
    description: 'Mzadat auction platform REST API',
    contact: { name: 'Mzadat Team' },
  },
  servers: [
    { url: '/api', description: 'API base path' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase-issued JWT access token',
      },
    },
    schemas: {
      // ── Common ────────────────────────────────────────
      SuccessResponse: {
        type: 'object' as const,
        properties: {
          success: { type: 'boolean' as const, example: true },
        },
      },
      ErrorResponse: {
        type: 'object' as const,
        properties: {
          success: { type: 'boolean' as const, example: false },
          error: { type: 'string' as const },
        },
      },
      PaginationParams: {
        type: 'object' as const,
        properties: {
          limit: { type: 'integer' as const, default: 50, maximum: 100 },
          offset: { type: 'integer' as const, default: 0 },
        },
      },

      // ── Auth ──────────────────────────────────────────
      RegisterInput: {
        type: 'object' as const,
        required: ['email', 'password', 'firstName', 'lastName', 'phone'],
        properties: {
          email: { type: 'string' as const, format: 'email' },
          password: { type: 'string' as const, minLength: 8 },
          firstName: { type: 'string' as const },
          lastName: { type: 'string' as const },
          phone: { type: 'string' as const },
        },
      },
      MerchantRegisterInput: {
        type: 'object' as const,
        required: ['email', 'password', 'firstName', 'lastName', 'phone', 'storeName'],
        properties: {
          email: { type: 'string' as const, format: 'email' },
          password: { type: 'string' as const, minLength: 8 },
          firstName: { type: 'string' as const },
          lastName: { type: 'string' as const },
          phone: { type: 'string' as const },
          storeName: { type: 'string' as const },
        },
      },
      LoginInput: {
        type: 'object' as const,
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' as const, format: 'email' },
          password: { type: 'string' as const },
        },
      },
      RefreshTokenInput: {
        type: 'object' as const,
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' as const },
        },
      },
      VerifyEmailInput: {
        type: 'object' as const,
        required: ['tokenHash', 'type'],
        properties: {
          tokenHash: { type: 'string' as const },
          type: { type: 'string' as const },
        },
      },
      ForgotPasswordInput: {
        type: 'object' as const,
        required: ['email'],
        properties: {
          email: { type: 'string' as const, format: 'email' },
          redirectTo: { type: 'string' as const },
        },
      },
      ResetPasswordInput: {
        type: 'object' as const,
        required: ['password'],
        properties: {
          password: { type: 'string' as const, minLength: 8 },
        },
      },
      UpdatePasswordInput: {
        type: 'object' as const,
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' as const },
          newPassword: { type: 'string' as const, minLength: 8 },
        },
      },

      // ── Bid ───────────────────────────────────────────
      PlaceBidInput: {
        type: 'object' as const,
        required: ['productId', 'amount'],
        properties: {
          productId: { type: 'string' as const, format: 'uuid' },
          amount: { type: 'number' as const },
        },
      },

      // ── Payment Gateway ───────────────────────────────
      GatewayInput: {
        type: 'object' as const,
        required: ['code', 'provider', 'name', 'credentials'],
        properties: {
          code: { type: 'string' as const },
          provider: { type: 'string' as const },
          name: { type: 'string' as const },
          credentials: { type: 'object' as const },
          isActive: { type: 'boolean' as const, default: true },
        },
      },
    },
  },

  // ── Paths ─────────────────────────────────────────────
  paths: {
    // ── Auth ────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Customer registration',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } },
        },
        responses: {
          '201': { description: 'Registered successfully' },
          '400': { description: 'Validation error' },
          '409': { description: 'Email already exists' },
        },
      },
    },
    '/auth/register/merchant': {
      post: {
        tags: ['Auth'],
        summary: 'Merchant registration (creates store)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MerchantRegisterInput' } } },
        },
        responses: {
          '201': { description: 'Merchant registered successfully' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with email and password',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out (revoke tokens)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Logged out' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenInput' } } },
        },
        responses: {
          '200': { description: 'Token refreshed' },
          '401': { description: 'Invalid refresh token' },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email via Supabase token_hash',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyEmailInput' } } },
        },
        responses: {
          '200': { description: 'Email verified' },
          '400': { description: 'Invalid token' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordInput' } } },
        },
        responses: {
          '200': { description: 'Reset email sent (if account exists)' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with recovery token',
        description: 'Pass the recovery access_token from Supabase email link as a Bearer token.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordInput' } } },
        },
        responses: {
          '200': { description: 'Password reset' },
          '401': { description: 'Invalid recovery token' },
        },
      },
    },
    '/auth/update-password': {
      put: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdatePasswordInput' } } },
        },
        responses: {
          '200': { description: 'Password updated' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'User profile' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend email verification',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordInput' } } },
        },
        responses: {
          '200': { description: 'Verification email resent (if account exists)' },
        },
      },
    },

    // ── Auctions ────────────────────────────────────────
    '/auctions/live': {
      get: {
        tags: ['Auctions'],
        summary: 'List live auctions',
        parameters: [
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 50, maximum: 100 } },
          { name: 'offset', in: 'query' as const, schema: { type: 'integer' as const, default: 0 } },
        ],
        responses: { '200': { description: 'List of live auctions' } },
      },
    },
    '/auctions/upcoming': {
      get: {
        tags: ['Auctions'],
        summary: 'List upcoming auctions',
        parameters: [
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 50, maximum: 100 } },
          { name: 'offset', in: 'query' as const, schema: { type: 'integer' as const, default: 0 } },
        ],
        responses: { '200': { description: 'List of upcoming auctions' } },
      },
    },
    '/auctions/ended': {
      get: {
        tags: ['Auctions'],
        summary: 'List recently ended auctions',
        parameters: [
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 50, maximum: 100 } },
          { name: 'offset', in: 'query' as const, schema: { type: 'integer' as const, default: 0 } },
        ],
        responses: { '200': { description: 'List of ended auctions' } },
      },
    },
    '/auctions/dashboard': {
      get: {
        tags: ['Auctions'],
        summary: 'Dashboard statistics (admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Dashboard stats' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/auctions/ws-stats': {
      get: {
        tags: ['Auctions'],
        summary: 'WebSocket connection stats (admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'WebSocket stats' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/auctions/{id}': {
      get: {
        tags: ['Auctions'],
        summary: 'Get single auction details',
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
        ],
        responses: {
          '200': { description: 'Auction details' },
          '404': { description: 'Auction not found' },
        },
      },
    },
    '/auctions/{id}/bids': {
      get: {
        tags: ['Auctions'],
        summary: 'Bid history for an auction',
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 50, maximum: 100 } },
          { name: 'offset', in: 'query' as const, schema: { type: 'integer' as const, default: 0 } },
        ],
        responses: { '200': { description: 'Bid history' } },
      },
    },

    // ── Bids ────────────────────────────────────────────
    '/bids': {
      post: {
        tags: ['Bids'],
        summary: 'Place a bid',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PlaceBidInput' } } },
        },
        responses: {
          '201': { description: 'Bid placed' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '409': { description: 'Bid conflict (outbid, auction ended, etc.)' },
        },
      },
    },
    '/bids/my': {
      get: {
        tags: ['Bids'],
        summary: "Current user's bid history",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 50, maximum: 100 } },
          { name: 'offset', in: 'query' as const, schema: { type: 'integer' as const, default: 0 } },
        ],
        responses: {
          '200': { description: 'User bid history' },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    // ── Categories ──────────────────────────────────────
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        parameters: [
          { name: 'status', in: 'query' as const, schema: { type: 'string' as const, enum: ['active', 'inactive', 'all'], default: 'active' } },
          { name: 'parentId', in: 'query' as const, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'rootOnly', in: 'query' as const, schema: { type: 'string' as const, enum: ['1', 'true'] } },
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 100, maximum: 500 } },
          { name: 'offset', in: 'query' as const, schema: { type: 'integer' as const, default: 0 } },
        ],
        responses: { '200': { description: 'List of categories' } },
      },
    },
    '/categories/tree': {
      get: {
        tags: ['Categories'],
        summary: 'Full nested category tree',
        parameters: [
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
        ],
        responses: { '200': { description: 'Category tree' } },
      },
    },
    '/categories/{slug}': {
      get: {
        tags: ['Categories'],
        summary: 'Single category with children',
        parameters: [
          { name: 'slug', in: 'path' as const, required: true, schema: { type: 'string' as const } },
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
        ],
        responses: {
          '200': { description: 'Category details' },
          '404': { description: 'Category not found' },
        },
      },
    },

    // ── Groups ──────────────────────────────────────────
    '/groups': {
      get: {
        tags: ['Groups'],
        summary: 'List groups',
        parameters: [
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
          { name: 'status', in: 'query' as const, schema: { type: 'string' as const, enum: ['upcoming', 'active', 'closed', 'cancelled'] } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 50, maximum: 100 } },
          { name: 'offset', in: 'query' as const, schema: { type: 'integer' as const, default: 0 } },
        ],
        responses: { '200': { description: 'List of groups' } },
      },
    },
    '/groups/active': {
      get: {
        tags: ['Groups'],
        summary: 'Active groups with lot counts',
        parameters: [
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
        ],
        responses: { '200': { description: 'Active groups' } },
      },
    },
    '/groups/{id}': {
      get: {
        tags: ['Groups'],
        summary: 'Single group with all lots',
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'locale', in: 'query' as const, schema: { type: 'string' as const, enum: ['en', 'ar'], default: 'en' } },
        ],
        responses: {
          '200': { description: 'Group with lots' },
          '404': { description: 'Group not found' },
        },
      },
    },

    // ── Payment Gateways (admin) ────────────────────────
    '/payment-gateways': {
      get: {
        tags: ['Payment Gateways'],
        summary: 'List all gateways',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'active', in: 'query' as const, schema: { type: 'string' as const, enum: ['true', 'false'] } },
        ],
        responses: {
          '200': { description: 'List of gateways' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
        },
      },
      post: {
        tags: ['Payment Gateways'],
        summary: 'Create a new gateway',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GatewayInput' } } },
        },
        responses: {
          '201': { description: 'Gateway created' },
          '400': { description: 'Missing required fields' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
          '409': { description: 'Gateway code already exists' },
        },
      },
    },
    '/payment-gateways/{code}': {
      get: {
        tags: ['Payment Gateways'],
        summary: 'Get a gateway by code',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path' as const, required: true, schema: { type: 'string' as const } },
        ],
        responses: {
          '200': { description: 'Gateway details' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Payment Gateways'],
        summary: 'Update a gateway',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path' as const, required: true, schema: { type: 'string' as const } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GatewayInput' } } },
        },
        responses: {
          '200': { description: 'Gateway updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Payment Gateways'],
        summary: 'Delete a gateway',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path' as const, required: true, schema: { type: 'string' as const } },
        ],
        responses: {
          '200': { description: 'Gateway deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/payment-gateways/{code}/toggle': {
      patch: {
        tags: ['Payment Gateways'],
        summary: 'Toggle gateway active state',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path' as const, required: true, schema: { type: 'string' as const } },
        ],
        responses: {
          '200': { description: 'Gateway toggled' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/payment-gateways/{code}/test': {
      post: {
        tags: ['Payment Gateways'],
        summary: 'Test gateway credentials',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path' as const, required: true, schema: { type: 'string' as const } },
        ],
        responses: {
          '200': { description: 'Test result' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin access required' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication & user management' },
    { name: 'Auctions', description: 'Auction listings & details' },
    { name: 'Bids', description: 'Bid placement & history' },
    { name: 'Categories', description: 'Product categories' },
    { name: 'Groups', description: 'Auction groups' },
    { name: 'Payment Gateways', description: 'Payment gateway management (admin)' },
  ],
}

export function setupSwagger(app: Express): void {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Mzadat API Docs',
  }))

  // Serve raw OpenAPI JSON
  app.get('/docs.json', (_req, res) => {
    res.json(swaggerDocument)
  })
}
