'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@mzadat/db'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────

export interface CategoryRow {
  id: string
  slug: string
  nameEn: string
  nameAr: string
  descriptionEn: string | null
  descriptionAr: string | null
  icon: string | null
  image: string | null
  sortOrder: number
  status: 'active' | 'inactive'
  parentId: string | null
  parentNameEn: string | null
  childrenCount: number
  productsCount: number
  createdAt: Date
}

export interface CategoryFormData {
  slug: string
  nameEn: string
  nameAr: string
  descriptionEn?: string
  descriptionAr?: string
  icon?: string
  image?: string
  sortOrder?: number
  parentId?: string
  status: 'active' | 'inactive'
}

// ── Read ─────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryRow[]> {
  await requireAdmin()

  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      parent: { select: { name: true } },
      _count: { select: { children: true, products: true } },
    },
  })

  return rows.map((r) => {
    const name = r.name as Record<string, string>
    const desc = (r.description ?? {}) as Record<string, string>
    const parentName = r.parent?.name as Record<string, string> | null

    return {
      id: r.id,
      slug: r.slug,
      nameEn: name?.en ?? '',
      nameAr: name?.ar ?? '',
      descriptionEn: desc?.en ?? null,
      descriptionAr: desc?.ar ?? null,
      icon: r.icon,
      image: r.image,
      sortOrder: r.sortOrder,
      status: r.status as 'active' | 'inactive',
      parentId: r.parentId,
      parentNameEn: parentName?.en ?? null,
      childrenCount: r._count.children,
      productsCount: r._count.products,
      createdAt: r.createdAt,
    }
  })
}

// ── Create ────────────────────────────────────────────────────────

export async function createCategory(data: CategoryFormData): Promise<{ error?: string }> {
  await requireAdmin()

  if (!data.slug || !data.nameEn) {
    return { error: 'Slug and English name are required.' }
  }

  try {
    await prisma.category.create({
      data: {
        slug: data.slug.trim().toLowerCase(),
        name: { en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' },
        description: {
          en: data.descriptionEn?.trim() ?? null,
          ar: data.descriptionAr?.trim() ?? null,
        },
        icon: data.icon?.trim() || null,
        image: data.image?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
        parentId: data.parentId || null,
        status: data.status,
      },
    })
  } catch (err: any) {
    if (err?.code === 'P2002') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[createCategory]', err)
    return { error: 'Failed to create category.' }
  }

  revalidatePath('/categories')
  return {}
}

// ── Update ────────────────────────────────────────────────────────

export async function updateCategory(
  id: string,
  data: CategoryFormData,
): Promise<{ error?: string }> {
  await requireAdmin()

  if (!data.slug || !data.nameEn) {
    return { error: 'Slug and English name are required.' }
  }

  // Prevent a category from being its own parent
  if (data.parentId === id) {
    return { error: 'A category cannot be its own parent.' }
  }

  try {
    await prisma.category.update({
      where: { id },
      data: {
        slug: data.slug.trim().toLowerCase(),
        name: { en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' },
        description: {
          en: data.descriptionEn?.trim() ?? null,
          ar: data.descriptionAr?.trim() ?? null,
        },
        icon: data.icon?.trim() || null,
        image: data.image?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
        parentId: data.parentId || null,
        status: data.status,
        updatedAt: new Date(),
      },
    })
  } catch (err: any) {
    if (err?.code === 'P2002') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[updateCategory]', err)
    return { error: 'Failed to update category.' }
  }

  revalidatePath('/categories')
  return {}
}

// ── Delete ────────────────────────────────────────────────────────

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const sb = await createSupabaseServiceClient()

  const [, targetRes] = await Promise.all([
    requireAdmin(),
    sb.from('categories').select('id, name, parent_id').eq('id', id).single(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = targetRes.data as any
  if (!target) return { error: 'Category not found.' }

  // Check product count
  const { count } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .is('deleted_at', null)
  const productCount = count ?? 0

  if (productCount > 0) {
    return {
      error: `Cannot delete "${(target.name as Record<string, string>)?.en ?? target.id}" — it has ${productCount} lot${productCount === 1 ? '' : 's'} associated with it. Reassign or remove the lots first.`,
    }
  }

  try {
    // Move children up one level before deleting
    await prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: target.parent_id ?? null },
    })

    await prisma.category.delete({ where: { id } })
  } catch (err) {
    console.error('[deleteCategory]', err)
    return { error: 'Failed to delete category.' }
  }

  revalidatePath('/categories')
  return {}
}
