// ═══════════════════════════════════════════
// Role-based Permission Matrix
// ═══════════════════════════════════════════

export const PERMISSIONS = {
  // Auction
  'auction:browse': ['customer', 'merchant', 'admin', 'super_admin'],
  'auction:bid': ['customer'],
  'auction:create': ['merchant', 'admin', 'super_admin'],
  'auction:manage': ['admin', 'super_admin'],

  // Products
  'product:create': ['merchant', 'admin', 'super_admin'],
  'product:edit_own': ['merchant'],
  'product:edit_any': ['admin', 'super_admin'],
  'product:delete': ['super_admin'],

  // Store
  'store:manage_own': ['merchant'],
  'store:manage_any': ['admin', 'super_admin'],

  // Users
  'user:view_own': ['customer', 'merchant', 'admin', 'super_admin'],
  'user:manage': ['admin', 'super_admin'],
  'user:impersonate': ['admin', 'super_admin'],
  'user:delete': ['super_admin'],

  // Orders & Finance
  'order:view_own': ['customer', 'merchant'],
  'order:manage': ['admin', 'super_admin'],
  'wallet:view_own': ['customer', 'merchant'],
  'wallet:manage': ['admin', 'super_admin'],
  'deposit:approve': ['admin', 'super_admin'],
  'withdrawal:approve': ['admin', 'super_admin'],

  // Support
  'ticket:create': ['customer', 'merchant'],
  'ticket:manage': ['admin', 'super_admin'],

  // System
  'settings:view': ['admin', 'super_admin'],
  'settings:manage': ['super_admin'],
  'audit:view': ['admin', 'super_admin'],
  'report:view': ['admin', 'super_admin'],

  // CMS
  'cms:manage': ['admin', 'super_admin'],
} as const

export type Permission = keyof typeof PERMISSIONS
export type Role = 'customer' | 'merchant' | 'admin' | 'super_admin'

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission]
  return (allowed as readonly string[]).includes(role)
}

export function getAllPermissions(role: Role): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((perm) => hasPermission(role, perm))
}
