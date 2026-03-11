import { BlogFormClient } from '../blog-form-client'

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  return <BlogFormClient paramsPromise={params} />
}
