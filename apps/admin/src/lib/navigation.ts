import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Gavel,
  Store,
  Wallet,
  TicketCheck,
  BarChart3,
  Settings,
  FileText,
  Globe,
  Bell,
  Shield,
  FolderTree,
  Layers,
  Trophy,
  Hammer,
  ArrowLeftRight,
  CreditCard,
  MapPin,
  TrendingUp,
  Banknote,
  PenSquare,
  BookOpen,
  LayoutGrid,
  Menu,
  Mail,
  MessageSquare,
  Sliders,
  Droplets,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  permission?: string
  badge?: string
  external?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const sidebarNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { label: 'Categories', href: '/categories', icon: FolderTree, permission: 'product:edit_any' },
      { label: 'Groups', href: '/groups', icon: Layers, permission: 'product:edit_any' },
      { label: 'Lots', href: '/products', icon: Package, permission: 'product:edit_any' },
      { label: 'Auctions', href: '/auctions', icon: Gavel, permission: 'auction:manage' },
      { label: 'Bidding', href: '/bidding', icon: Hammer, permission: 'auction:manage' },
      { label: 'Winners', href: '/winners', icon: Trophy, permission: 'auction:manage' },
      { label: 'Orders', href: '/orders', icon: ShoppingCart, permission: 'order:manage' },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'All Users', href: '/users', icon: Users, permission: 'user:manage' },
      { label: 'Stores', href: '/stores', icon: Store, permission: 'store:manage_any' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Wallets', href: '/wallets', icon: Wallet, permission: 'wallet:manage' },
      { label: 'Deposits', href: '/deposits', icon: Banknote, permission: 'deposit:approve' },
      { label: 'Withdrawals', href: '/withdrawals', icon: Wallet, permission: 'withdrawal:approve' },
      { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight, permission: 'wallet:manage' },
      { label: 'Profit', href: '/profit', icon: TrendingUp, permission: 'report:view' },
      { label: 'Payment Methods', href: '/payment-methods', icon: CreditCard, permission: 'settings:manage' },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Tickets', href: '/tickets', icon: TicketCheck, permission: 'ticket:manage' },
      { label: 'Notifications', href: '/notifications', icon: Bell, permission: 'user:manage' },
    ],
  },
  {
    label: 'CMS',
    items: [
      { label: 'Blog Posts', href: '/cms/blogs', icon: PenSquare, permission: 'cms:manage' },
      { label: 'Blog Categories', href: '/cms/blog-categories', icon: BookOpen, permission: 'cms:manage' },
      { label: 'Widgets', href: '/cms/widgets', icon: LayoutGrid, permission: 'cms:manage' },
      { label: 'Menus', href: '/cms/menus', icon: Menu, permission: 'cms:manage' },
      { label: 'Email Templates', href: '/cms/email-templates', icon: Mail, permission: 'cms:manage' },
      { label: 'Contact Messages', href: '/cms/contacts', icon: MessageSquare, permission: 'cms:manage' },
      { label: 'Site Settings', href: '/cms/settings', icon: Sliders, permission: 'cms:manage' },
      { label: 'Watermarks', href: '/cms/watermarks', icon: Droplets, permission: 'cms:manage' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'report:view' },
      { label: 'Audit Log', href: '/audit-log', icon: FileText, permission: 'audit:view' },
      { label: 'Locations', href: '/locations', icon: MapPin, permission: 'settings:manage' },
      { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings:view' },
      { label: 'Roles', href: '/roles', icon: Shield, permission: 'settings:manage' },
    ],
  },
]
