import Link from 'next/link'
import Image from 'next/image'
import { Calendar, User, ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent } from '@mzadat/ui/components/card'
import { Badge } from '@mzadat/ui/components/badge'
import { AnimatedSection, StaggerGrid, StaggerItem } from '@/lib/motion'
import { getBlogs, getBlogCategories, type CMSBlog } from '@/lib/cms'

export const metadata = {
  title: 'المدونة | مزادات',
  description: 'آخر الأخبار والمقالات من منصة مزادات',
}

export default async function BlogPage() {
  const isAr = false
  const [blogsResult, categories] = await Promise.all([
    getBlogs().catch(() => ({ docs: [] as CMSBlog[] })),
    getBlogCategories().catch(() => []),
  ])
  const blogs = blogsResult.docs

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 text-center">
          <AnimatedSection>
            <Badge className="mb-4 border-white/20 bg-white/10 text-white">
              {isAr ? 'مدونة مزادات' : 'Mzadat Blog'}
            </Badge>
            <h1 className="text-4xl font-bold text-white md:text-5xl">
              {isAr ? 'المدونة' : 'Blog'}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              {isAr
                ? 'آخر الأخبار والمقالات والنصائح حول المزادات في سلطنة عمان'
                : 'Latest news, articles and auction tips in Oman'}
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="container mx-auto px-4 py-16">
        {blogs.length === 0 ? (
          <AnimatedSection className="py-20 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold text-foreground">
              {isAr ? 'قريباً' : 'Coming Soon'}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isAr ? 'نعمل على إضافة محتوى جديد. ترقبوا!' : 'We are working on new content. Stay tuned!'}
            </p>
          </AnimatedSection>
        ) : (
          <StaggerGrid className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog: CMSBlog) => (
              <StaggerItem key={blog.id}>
                <Link href={`/blog/${blog.slug}`}>
                  <Card className="group overflow-hidden transition-all hover:shadow-lg">
                    {blog.featureImage && (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={blog.featureImage}
                          alt={blog.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {blog.categoryName && (
                          <Badge className="absolute start-3 top-3 bg-primary-600 text-white">
                            {blog.categoryName}
                          </Badge>
                        )}
                      </div>
                    )}
                    <CardContent className="p-5">
                      <h3 className="line-clamp-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary-600">
                        {blog.title}
                      </h3>
                      {blog.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {blog.excerpt}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(blog.createdAt).toLocaleDateString(isAr ? 'ar-OM' : 'en-US')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGrid>
        )}
      </section>
    </div>
  )
}
