import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, User, ArrowRight, ArrowLeft, Share2 } from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { Button } from '@mzadat/ui'
import { AnimatedSection } from '@/lib/motion'
import { getBlog, getBlogs, type CMSBlog } from '@/lib/cms'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const blog = await getBlog(slug).catch(() => null)
  if (!blog) return { title: 'Not Found' }
  return {
    title: `${blog.title} | مزادات`,
    description: blog.excerpt || '',
  }
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params
  const isAr = false

  const blog = await getBlog(slug).catch(() => null)
  if (!blog) notFound()

  const relatedResult = await getBlogs('ar', 6).catch(() => ({ docs: [] }))
  const related = relatedResult.docs.filter((b: CMSBlog) => b.slug !== slug).slice(0, 3)

  return (
    <div className="min-h-screen">
      {/* Hero Image */}
      {blog.featureImage && (
        <div className="relative h-64 w-full md:h-96">
          <Image
            src={blog.featureImage}
            alt={blog.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Content */}
      <article className="container mx-auto px-4 py-12">
        <AnimatedSection className="mx-auto max-w-3xl">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary-600">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-primary-600">{isAr ? 'المدونة' : 'Blog'}</Link>
            <span>/</span>
            <span className="text-foreground">{blog.title}</span>
          </div>

          {/* Category */}
          {blog.categoryName && (
            <Badge className="mb-4 bg-primary-100 text-primary-700">
              {blog.categoryName}
            </Badge>
          )}

          {/* Title */}
          <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
            {blog.title}
          </h1>

          {/* Meta */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(blog.createdAt).toLocaleDateString(isAr ? 'ar-OM' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <Button variant="ghost" size="sm" className="ms-auto gap-1.5">
              <Share2 className="h-4 w-4" />
              {isAr ? 'مشاركة' : 'Share'}
            </Button>
          </div>

          {/* Body */}
          <div
            className="prose prose-lg mt-10 max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: typeof blog.body === 'string' ? blog.body : '' }}
          />

          {/* Back link */}
          <div className="mt-12 border-t border-border pt-8">
            <Link href="/blog">
              <Button variant="outline" className="gap-2">
                {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                {isAr ? 'العودة إلى المدونة' : 'Back to Blog'}
              </Button>
            </Link>
          </div>
        </AnimatedSection>

        {/* Related Posts */}
        {related.length > 0 && (
          <section className="mx-auto mt-16 max-w-5xl">
            <h2 className="mb-8 text-2xl font-bold text-foreground">
              {isAr ? 'مقالات ذات صلة' : 'Related Articles'}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((post: CMSBlog) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <div className="group rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-lg">
                    <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary-600">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString(isAr ? 'ar-OM' : 'en-US')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
