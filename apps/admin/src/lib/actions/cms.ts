'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { query, queryOne } from '@mzadat/db/pool'
import { requireAdmin } from '@/lib/auth'

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function pickLocale(json: unknown, locale = 'en'): string {
  if (!json || typeof json !== 'object') return ''
  return (json as Record<string, string>)[locale] ?? ''
}

// ════════════════════════════════════════════════════════════════
// BLOG CATEGORIES
// ════════════════════════════════════════════════════════════════

export interface BlogCategoryRow {
  id: string
  name: Record<string, string>
  slug: string
  description: Record<string, string> | null
  image: string | null
  status: string
  createdAt: string
  blogsCount: number
}

export interface BlogCategoryFormData {
  nameEn: string
  nameAr: string
  slug: string
  descriptionEn?: string
  descriptionAr?: string
  image?: string
  status: string
}

export async function getBlogCategories(): Promise<BlogCategoryRow[]> {
  await requireAdmin()
  const rows = await query<{
    id: string; name: unknown; slug: string; description: unknown
    image: string | null; status: string; created_at: string; blogs_count: string
  }>(`
    SELECT bc.*,
      (SELECT count(*) FROM blogs b WHERE b.category_id = bc.id)::text AS blogs_count
    FROM blog_categories bc
    ORDER BY bc.created_at DESC
  `)
  return rows.map(r => ({
    id: r.id,
    name: (r.name ?? {}) as Record<string, string>,
    slug: r.slug,
    description: (r.description ?? null) as Record<string, string> | null,
    image: r.image,
    status: r.status,
    createdAt: r.created_at,
    blogsCount: parseInt(r.blogs_count ?? '0', 10),
  }))
}

export async function createBlogCategory(data: BlogCategoryFormData) {
  await requireAdmin()
  if (!data.slug || !data.nameEn) return { error: 'Slug and English name are required.' }
  try {
    await query(`
      INSERT INTO blog_categories (name, slug, description, image, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      JSON.stringify({ en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' }),
      data.slug.trim().toLowerCase(),
      JSON.stringify({ en: data.descriptionEn?.trim() ?? '', ar: data.descriptionAr?.trim() ?? '' }),
      data.image?.trim() || null,
      data.status || 'active',
    ])
  } catch (err: any) {
    if (err?.code === '23505') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[createBlogCategory]', err)
    return { error: 'Failed to create blog category.' }
  }
  revalidatePath('/cms/blog-categories')
  return {}
}

export async function updateBlogCategory(id: string, data: BlogCategoryFormData) {
  await requireAdmin()
  if (!data.slug || !data.nameEn) return { error: 'Slug and English name are required.' }
  try {
    await query(`
      UPDATE blog_categories SET
        name = $1, slug = $2, description = $3, image = $4, status = $5, updated_at = now()
      WHERE id = $6
    `, [
      JSON.stringify({ en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' }),
      data.slug.trim().toLowerCase(),
      JSON.stringify({ en: data.descriptionEn?.trim() ?? '', ar: data.descriptionAr?.trim() ?? '' }),
      data.image?.trim() || null,
      data.status || 'active',
      id,
    ])
  } catch (err: any) {
    if (err?.code === '23505') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[updateBlogCategory]', err)
    return { error: 'Failed to update blog category.' }
  }
  revalidatePath('/cms/blog-categories')
  return {}
}

export async function deleteBlogCategory(id: string) {
  await requireAdmin()
  const count = await queryOne<{ c: string }>(`SELECT count(*)::text AS c FROM blogs WHERE category_id = $1`, [id])
  if (parseInt(count?.c ?? '0', 10) > 0) return { error: 'Cannot delete — category has associated blog posts.' }
  try {
    await query(`DELETE FROM blog_categories WHERE id = $1`, [id])
  } catch (err) {
    console.error('[deleteBlogCategory]', err)
    return { error: 'Failed to delete blog category.' }
  }
  revalidatePath('/cms/blog-categories')
  return {}
}

// ════════════════════════════════════════════════════════════════
// BLOGS
// ════════════════════════════════════════════════════════════════

export interface BlogRow {
  id: string
  title: Record<string, string>
  slug: string
  excerpt: Record<string, string> | null
  body: Record<string, string> | null
  featureImage: string | null
  categoryId: string | null
  categoryName: string | null
  tags: string[]
  seoTitle: Record<string, string> | null
  seoDesc: Record<string, string> | null
  seoImage: string | null
  status: string
  publishedAt: string | null
  createdAt: string
}

export interface BlogFormData {
  titleEn: string
  titleAr: string
  slug: string
  excerptEn?: string
  excerptAr?: string
  bodyEn?: string
  bodyAr?: string
  featureImage?: string
  categoryId?: string
  tags?: string[]
  seoTitleEn?: string
  seoTitleAr?: string
  seoDescEn?: string
  seoDescAr?: string
  seoImage?: string
  status: string
}

export async function getBlogs(): Promise<BlogRow[]> {
  await requireAdmin()
  const rows = await query<{
    id: string; title: unknown; slug: string; excerpt: unknown; body: unknown
    feature_image: string | null; category_id: string | null; category_name: unknown
    tags: string[]; seo_title: unknown; seo_desc: unknown; seo_image: string | null
    status: string; published_at: string | null; created_at: string
  }>(`
    SELECT b.*,
      bc.name AS category_name
    FROM blogs b
    LEFT JOIN blog_categories bc ON bc.id = b.category_id
    ORDER BY b.created_at DESC
  `)
  return rows.map(r => ({
    id: r.id,
    title: (r.title ?? {}) as Record<string, string>,
    slug: r.slug,
    excerpt: (r.excerpt ?? null) as Record<string, string> | null,
    body: (r.body ?? null) as Record<string, string> | null,
    featureImage: r.feature_image,
    categoryId: r.category_id,
    categoryName: pickLocale(r.category_name, 'en'),
    tags: r.tags ?? [],
    seoTitle: (r.seo_title ?? null) as Record<string, string> | null,
    seoDesc: (r.seo_desc ?? null) as Record<string, string> | null,
    seoImage: r.seo_image,
    status: r.status,
    publishedAt: r.published_at,
    createdAt: r.created_at,
  }))
}

export async function getBlog(id: string): Promise<BlogRow | null> {
  await requireAdmin()
  const r = await queryOne<{
    id: string; title: unknown; slug: string; excerpt: unknown; body: unknown
    feature_image: string | null; category_id: string | null; category_name: unknown
    tags: string[]; seo_title: unknown; seo_desc: unknown; seo_image: string | null
    status: string; published_at: string | null; created_at: string
  }>(`
    SELECT b.*, bc.name AS category_name
    FROM blogs b
    LEFT JOIN blog_categories bc ON bc.id = b.category_id
    WHERE b.id = $1
  `, [id])
  if (!r) return null
  return {
    id: r.id,
    title: (r.title ?? {}) as Record<string, string>,
    slug: r.slug,
    excerpt: (r.excerpt ?? null) as Record<string, string> | null,
    body: (r.body ?? null) as Record<string, string> | null,
    featureImage: r.feature_image,
    categoryId: r.category_id,
    categoryName: pickLocale(r.category_name, 'en'),
    tags: r.tags ?? [],
    seoTitle: (r.seo_title ?? null) as Record<string, string> | null,
    seoDesc: (r.seo_desc ?? null) as Record<string, string> | null,
    seoImage: r.seo_image,
    status: r.status,
    publishedAt: r.published_at,
    createdAt: r.created_at,
  }
}

export async function createBlog(data: BlogFormData) {
  await requireAdmin()
  if (!data.slug || !data.titleEn) return { error: 'Slug and English title are required.' }
  try {
    await query(`
      INSERT INTO blogs (title, slug, excerpt, body, feature_image, category_id, tags, seo_title, seo_desc, seo_image, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      JSON.stringify({ en: data.titleEn.trim(), ar: data.titleAr?.trim() ?? '' }),
      data.slug.trim().toLowerCase(),
      JSON.stringify({ en: data.excerptEn?.trim() ?? '', ar: data.excerptAr?.trim() ?? '' }),
      JSON.stringify({ en: data.bodyEn?.trim() ?? '', ar: data.bodyAr?.trim() ?? '' }),
      data.featureImage?.trim() || null,
      data.categoryId || null,
      data.tags ?? [],
      JSON.stringify({ en: data.seoTitleEn?.trim() ?? '', ar: data.seoTitleAr?.trim() ?? '' }),
      JSON.stringify({ en: data.seoDescEn?.trim() ?? '', ar: data.seoDescAr?.trim() ?? '' }),
      data.seoImage?.trim() || null,
      data.status || 'draft',
      data.status === 'published' ? new Date().toISOString() : null,
    ])
  } catch (err: any) {
    if (err?.code === '23505') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[createBlog]', err)
    return { error: 'Failed to create blog post.' }
  }
  revalidatePath('/cms/blogs')
  return {}
}

export async function updateBlog(id: string, data: BlogFormData) {
  await requireAdmin()
  if (!data.slug || !data.titleEn) return { error: 'Slug and English title are required.' }
  try {
    // If status changed to published and was not published before, set published_at
    const existing = await queryOne<{ status: string; published_at: string | null }>(
      `SELECT status, published_at FROM blogs WHERE id = $1`, [id]
    )
    const publishedAt = data.status === 'published' && !existing?.published_at
      ? new Date().toISOString()
      : existing?.published_at ?? null

    await query(`
      UPDATE blogs SET
        title = $1, slug = $2, excerpt = $3, body = $4, feature_image = $5,
        category_id = $6, tags = $7, seo_title = $8, seo_desc = $9, seo_image = $10,
        status = $11, published_at = $12, updated_at = now()
      WHERE id = $13
    `, [
      JSON.stringify({ en: data.titleEn.trim(), ar: data.titleAr?.trim() ?? '' }),
      data.slug.trim().toLowerCase(),
      JSON.stringify({ en: data.excerptEn?.trim() ?? '', ar: data.excerptAr?.trim() ?? '' }),
      JSON.stringify({ en: data.bodyEn?.trim() ?? '', ar: data.bodyAr?.trim() ?? '' }),
      data.featureImage?.trim() || null,
      data.categoryId || null,
      data.tags ?? [],
      JSON.stringify({ en: data.seoTitleEn?.trim() ?? '', ar: data.seoTitleAr?.trim() ?? '' }),
      JSON.stringify({ en: data.seoDescEn?.trim() ?? '', ar: data.seoDescAr?.trim() ?? '' }),
      data.seoImage?.trim() || null,
      data.status || 'draft',
      publishedAt,
      id,
    ])
  } catch (err: any) {
    if (err?.code === '23505') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[updateBlog]', err)
    return { error: 'Failed to update blog post.' }
  }
  revalidatePath('/cms/blogs')
  return {}
}

export async function deleteBlog(id: string) {
  await requireAdmin()
  try {
    await query(`DELETE FROM blogs WHERE id = $1`, [id])
  } catch (err) {
    console.error('[deleteBlog]', err)
    return { error: 'Failed to delete blog post.' }
  }
  revalidatePath('/cms/blogs')
  return {}
}

// ════════════════════════════════════════════════════════════════
// WIDGETS
// ════════════════════════════════════════════════════════════════

export interface WidgetRow {
  id: string
  title: string
  pageSlug: string
  widgetType: string
  content: unknown
  image: string | null
  linkUrl: string | null
  linkLabel: Record<string, string> | null
  linkNewTab: boolean
  extraData: unknown
  sortOrder: number
  status: string
  createdAt: string
}

export interface WidgetFormData {
  title: string
  pageSlug: string
  widgetType: string
  contentEn?: string
  contentAr?: string
  image?: string
  linkUrl?: string
  linkLabelEn?: string
  linkLabelAr?: string
  linkNewTab?: boolean
  extraData?: string // JSON string
  sortOrder?: number
  status: string
}

export async function getWidgets(): Promise<WidgetRow[]> {
  await requireAdmin()
  const rows = await query<{
    id: string; title: string; page_slug: string; widget_type: string
    content: unknown; image: string | null; link_url: string | null
    link_label: unknown; link_new_tab: boolean; extra_data: unknown
    sort_order: number; status: string; created_at: string
  }>(`SELECT * FROM widgets ORDER BY page_slug, sort_order`)
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    pageSlug: r.page_slug,
    widgetType: r.widget_type,
    content: r.content,
    image: r.image,
    linkUrl: r.link_url,
    linkLabel: (r.link_label ?? null) as Record<string, string> | null,
    linkNewTab: r.link_new_tab,
    extraData: r.extra_data,
    sortOrder: r.sort_order,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export async function createWidget(data: WidgetFormData) {
  await requireAdmin()
  if (!data.title || !data.pageSlug || !data.widgetType) return { error: 'Title, page, and type are required.' }
  try {
    await query(`
      INSERT INTO widgets (title, page_slug, widget_type, content, image, link_url, link_label, link_new_tab, extra_data, sort_order, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      data.title.trim(),
      data.pageSlug.trim(),
      data.widgetType.trim(),
      JSON.stringify({ en: data.contentEn?.trim() ?? '', ar: data.contentAr?.trim() ?? '' }),
      data.image?.trim() || null,
      data.linkUrl?.trim() || null,
      JSON.stringify({ en: data.linkLabelEn?.trim() ?? '', ar: data.linkLabelAr?.trim() ?? '' }),
      data.linkNewTab ?? false,
      data.extraData ? data.extraData : '{}',
      data.sortOrder ?? 0,
      data.status || 'active',
    ])
  } catch (err) {
    console.error('[createWidget]', err)
    return { error: 'Failed to create widget.' }
  }
  revalidatePath('/cms/widgets')
  return {}
}

export async function updateWidget(id: string, data: WidgetFormData) {
  await requireAdmin()
  if (!data.title || !data.pageSlug || !data.widgetType) return { error: 'Title, page, and type are required.' }
  try {
    await query(`
      UPDATE widgets SET
        title = $1, page_slug = $2, widget_type = $3, content = $4,
        image = $5, link_url = $6, link_label = $7, link_new_tab = $8,
        extra_data = $9, sort_order = $10, status = $11, updated_at = now()
      WHERE id = $12
    `, [
      data.title.trim(),
      data.pageSlug.trim(),
      data.widgetType.trim(),
      JSON.stringify({ en: data.contentEn?.trim() ?? '', ar: data.contentAr?.trim() ?? '' }),
      data.image?.trim() || null,
      data.linkUrl?.trim() || null,
      JSON.stringify({ en: data.linkLabelEn?.trim() ?? '', ar: data.linkLabelAr?.trim() ?? '' }),
      data.linkNewTab ?? false,
      data.extraData ? data.extraData : '{}',
      data.sortOrder ?? 0,
      data.status || 'active',
      id,
    ])
  } catch (err) {
    console.error('[updateWidget]', err)
    return { error: 'Failed to update widget.' }
  }
  revalidatePath('/cms/widgets')
  return {}
}

export async function deleteWidget(id: string) {
  await requireAdmin()
  try {
    await query(`DELETE FROM widgets WHERE id = $1`, [id])
  } catch (err) {
    console.error('[deleteWidget]', err)
    return { error: 'Failed to delete widget.' }
  }
  revalidatePath('/cms/widgets')
  return {}
}

// ════════════════════════════════════════════════════════════════
// MENUS
// ════════════════════════════════════════════════════════════════

export interface MenuRow {
  id: string
  name: Record<string, string>
  location: string
  items: unknown
  status: string
  createdAt: string
}

export interface MenuFormData {
  nameEn: string
  nameAr: string
  location: string
  items: string // JSON string of menu items array
  status: string
}

export async function getMenus(): Promise<MenuRow[]> {
  await requireAdmin()
  const rows = await query<{
    id: string; name: unknown; location: string; items: unknown
    status: string; created_at: string
  }>(`SELECT * FROM menus ORDER BY location, created_at`)
  return rows.map(r => ({
    id: r.id,
    name: (r.name ?? {}) as Record<string, string>,
    location: r.location,
    items: r.items,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export async function createMenu(data: MenuFormData) {
  await requireAdmin()
  if (!data.nameEn || !data.location) return { error: 'Name and location are required.' }
  try {
    await query(`
      INSERT INTO menus (name, location, items, status)
      VALUES ($1, $2, $3, $4)
    `, [
      JSON.stringify({ en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' }),
      data.location.trim(),
      data.items || '[]',
      data.status || 'active',
    ])
  } catch (err) {
    console.error('[createMenu]', err)
    return { error: 'Failed to create menu.' }
  }
  revalidatePath('/cms/menus')
  return {}
}

export async function updateMenu(id: string, data: MenuFormData) {
  await requireAdmin()
  if (!data.nameEn || !data.location) return { error: 'Name and location are required.' }
  try {
    await query(`
      UPDATE menus SET
        name = $1, location = $2, items = $3, status = $4, updated_at = now()
      WHERE id = $5
    `, [
      JSON.stringify({ en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' }),
      data.location.trim(),
      data.items || '[]',
      data.status || 'active',
      id,
    ])
  } catch (err) {
    console.error('[updateMenu]', err)
    return { error: 'Failed to update menu.' }
  }
  revalidatePath('/cms/menus')
  return {}
}

export async function deleteMenu(id: string) {
  await requireAdmin()
  try {
    await query(`DELETE FROM menus WHERE id = $1`, [id])
  } catch (err) {
    console.error('[deleteMenu]', err)
    return { error: 'Failed to delete menu.' }
  }
  revalidatePath('/cms/menus')
  return {}
}

// ════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ════════════════════════════════════════════════════════════════

export interface EmailTemplateRow {
  id: string
  name: string
  slug: string
  subject: Record<string, string>
  body: Record<string, string>
  variables: unknown
  status: string
  createdAt: string
}

export interface EmailTemplateFormData {
  name: string
  slug: string
  subjectEn: string
  subjectAr: string
  bodyEn: string
  bodyAr: string
  variables?: string // JSON string
  status: string
}

export async function getEmailTemplates(): Promise<EmailTemplateRow[]> {
  await requireAdmin()
  const rows = await query<{
    id: string; name: string; slug: string; subject: unknown; body: unknown
    variables: unknown; status: string; created_at: string
  }>(`SELECT * FROM email_templates ORDER BY name`)
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    subject: (r.subject ?? {}) as Record<string, string>,
    body: (r.body ?? {}) as Record<string, string>,
    variables: r.variables,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export async function createEmailTemplate(data: EmailTemplateFormData) {
  await requireAdmin()
  if (!data.name || !data.slug) return { error: 'Name and slug are required.' }
  try {
    await query(`
      INSERT INTO email_templates (name, slug, subject, body, variables, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      data.name.trim(),
      data.slug.trim().toLowerCase(),
      JSON.stringify({ en: data.subjectEn?.trim() ?? '', ar: data.subjectAr?.trim() ?? '' }),
      JSON.stringify({ en: data.bodyEn?.trim() ?? '', ar: data.bodyAr?.trim() ?? '' }),
      data.variables || '[]',
      data.status || 'active',
    ])
  } catch (err: any) {
    if (err?.code === '23505') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[createEmailTemplate]', err)
    return { error: 'Failed to create email template.' }
  }
  revalidatePath('/cms/email-templates')
  return {}
}

export async function updateEmailTemplate(id: string, data: EmailTemplateFormData) {
  await requireAdmin()
  if (!data.name || !data.slug) return { error: 'Name and slug are required.' }
  try {
    await query(`
      UPDATE email_templates SET
        name = $1, slug = $2, subject = $3, body = $4, variables = $5, status = $6, updated_at = now()
      WHERE id = $7
    `, [
      data.name.trim(),
      data.slug.trim().toLowerCase(),
      JSON.stringify({ en: data.subjectEn?.trim() ?? '', ar: data.subjectAr?.trim() ?? '' }),
      JSON.stringify({ en: data.bodyEn?.trim() ?? '', ar: data.bodyAr?.trim() ?? '' }),
      data.variables || '[]',
      data.status || 'active',
      id,
    ])
  } catch (err: any) {
    if (err?.code === '23505') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[updateEmailTemplate]', err)
    return { error: 'Failed to update email template.' }
  }
  revalidatePath('/cms/email-templates')
  return {}
}

export async function deleteEmailTemplate(id: string) {
  await requireAdmin()
  try {
    await query(`DELETE FROM email_templates WHERE id = $1`, [id])
  } catch (err) {
    console.error('[deleteEmailTemplate]', err)
    return { error: 'Failed to delete email template.' }
  }
  revalidatePath('/cms/email-templates')
  return {}
}

// ════════════════════════════════════════════════════════════════
// CONTACTS
// ════════════════════════════════════════════════════════════════

export interface ContactRow {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  isRead: boolean
  createdAt: string
}

export async function getContacts(): Promise<ContactRow[]> {
  await requireAdmin()
  const rows = await query<{
    id: string; name: string; email: string; phone: string | null
    subject: string | null; message: string; is_read: boolean; created_at: string
  }>(`SELECT * FROM contacts ORDER BY created_at DESC`)
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    subject: r.subject,
    message: r.message,
    isRead: r.is_read,
    createdAt: r.created_at,
  }))
}

export async function markContactRead(id: string) {
  await requireAdmin()
  await query(`UPDATE contacts SET is_read = true WHERE id = $1`, [id])
  revalidatePath('/cms/contacts')
  return {}
}

export async function deleteContact(id: string) {
  await requireAdmin()
  try {
    await query(`DELETE FROM contacts WHERE id = $1`, [id])
  } catch (err) {
    console.error('[deleteContact]', err)
    return { error: 'Failed to delete contact.' }
  }
  revalidatePath('/cms/contacts')
  return {}
}

// ════════════════════════════════════════════════════════════════
// SITE SETTINGS
// ════════════════════════════════════════════════════════════════

export interface SiteSettingRow {
  id: string
  key: string
  value: unknown
  updatedAt: string
}

export async function getSiteSettings(): Promise<SiteSettingRow[]> {
  await requireAdmin()
  const rows = await query<{
    id: string; key: string; value: unknown; updated_at: string
  }>(`SELECT * FROM site_settings ORDER BY key`)
  return rows.map(r => ({
    id: r.id,
    key: r.key,
    value: r.value,
    updatedAt: r.updated_at,
  }))
}

export async function updateSiteSetting(key: string, value: string) {
  await requireAdmin()
  try {
    const parsed = JSON.parse(value)
    await query(`
      INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, now())
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()
    `, [key, JSON.stringify(parsed)])
  } catch (err) {
    console.error('[updateSiteSetting]', err)
    return { error: 'Failed to update setting. Ensure the value is valid JSON.' }
  }
  revalidatePath('/cms/settings')
  return {}
}

// ════════════════════════════════════════════════════════════════
// WATERMARKS
// ════════════════════════════════════════════════════════════════

const BUCKET = 'media'
const PRIVATE_BUCKET = 'media-private'
const WATERMARK_PREFIX = 'watermarks'

let _storageClient: ReturnType<typeof createClient> | null = null
function getStorageClient() {
  if (!_storageClient) {
    _storageClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _storageClient
}

export interface WatermarkRow {
  id: string
  image: string
  isActive: boolean
  createdAt: string
  previewUrl: string | null
}

export async function getWatermarks(): Promise<WatermarkRow[]> {
  await requireAdmin()
  const rows = await query<{
    id: string; image: string; is_active: boolean; created_at: string
  }>(`SELECT * FROM watermarks ORDER BY created_at DESC`)

  return Promise.all(rows.map(async (r) => {
    let previewUrl: string | null = null
    try {
      const supabase = getStorageClient()
      const { data } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .createSignedUrl(r.image, 3600)
      previewUrl = data?.signedUrl ?? null
    } catch { /* ignore */ }
    return {
      id: r.id,
      image: r.image,
      isActive: r.is_active,
      createdAt: r.created_at,
      previewUrl,
    }
  }))
}

export async function uploadWatermark(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided.' }
  if (!file.type.startsWith('image/')) return { error: 'Only image files are allowed.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Watermark must be under 5MB.' }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `watermark_${timestamp}.${ext}`
    const storagePath = `${WATERMARK_PREFIX}/${fileName}`

    const supabase = getStorageClient()
    const { error: uploadError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: true,
      })
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

    // Insert into watermarks table (inactive by default)
    await query(
      `INSERT INTO watermarks (image, is_active) VALUES ($1, false)`,
      [storagePath],
    )
  } catch (err: any) {
    console.error('[uploadWatermark]', err)
    return { error: err.message || 'Upload failed.' }
  }

  revalidatePath('/cms/watermarks')
  return {}
}

export async function setActiveWatermark(id: string): Promise<{ error?: string }> {
  await requireAdmin()
  try {
    // Deactivate all, then activate the selected one
    await query(`UPDATE watermarks SET is_active = false`)
    await query(`UPDATE watermarks SET is_active = true WHERE id = $1`, [id])
  } catch (err: any) {
    console.error('[setActiveWatermark]', err)
    return { error: 'Failed to set active watermark.' }
  }
  revalidatePath('/cms/watermarks')
  return {}
}

export async function deactivateAllWatermarks(): Promise<{ error?: string }> {
  await requireAdmin()
  try {
    await query(`UPDATE watermarks SET is_active = false`)
  } catch (err: any) {
    console.error('[deactivateAllWatermarks]', err)
    return { error: 'Failed to deactivate watermarks.' }
  }
  revalidatePath('/cms/watermarks')
  return {}
}

export async function deleteWatermark(id: string): Promise<{ error?: string }> {
  await requireAdmin()
  try {
    // Get the image path first to delete from storage
    const row = await queryOne<{ image: string }>(`SELECT image FROM watermarks WHERE id = $1`, [id])
    if (row?.image) {
      const supabase = getStorageClient()
      await supabase.storage.from(PRIVATE_BUCKET).remove([row.image])
    }
    await query(`DELETE FROM watermarks WHERE id = $1`, [id])
  } catch (err: any) {
    console.error('[deleteWatermark]', err)
    return { error: 'Failed to delete watermark.' }
  }
  revalidatePath('/cms/watermarks')
  return {}
}
