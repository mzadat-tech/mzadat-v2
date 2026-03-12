-- ═══════════════════════════════════════════════════════════════════
-- Storage bucket architecture:
--   media         (public)  → auction/lot images, blog/CMS, logos
--   media-private (private) → watermarks, deposit proofs, profile imgs
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. Buckets
-- ──────────────────────────────────────────────────────────────────

-- Public bucket for auction images (already watermarked, SEO-friendly)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 'media', true,
  10485760,  -- 10 MB max
  ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml'];

-- Private bucket for sensitive files (proofs, watermarks, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-private', 'media-private', false,
  15728640,  -- 15 MB max (PDFs can be larger)
  ARRAY[
    'image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY[
    'image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml',
    'application/pdf'
  ];

-- ──────────────────────────────────────────────────────────────────
-- 2. Drop ALL old policies (clean slate)
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can upload deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for media" ON storage.objects;
DROP POLICY IF EXISTS "Private: upload deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Private: update own deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Private: read own files" ON storage.objects;

-- ──────────────────────────────────────────────────────────────────
-- 3. PUBLIC BUCKET (media) — read-only for everyone
--    Uploads ONLY via service_role key (admin server actions)
-- ──────────────────────────────────────────────────────────────────

-- Anyone can read public media (images are watermarked, SEO-indexed)
CREATE POLICY "media_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- NO INSERT/UPDATE/DELETE policies for media bucket!
-- Only service_role key (which bypasses RLS) can write.
-- This means: no client-side uploads, no tampering, no deletes via API.

-- ──────────────────────────────────────────────────────────────────
-- 4. PRIVATE BUCKET (media-private) — strict per-folder access
-- ──────────────────────────────────────────────────────────────────

-- 4a. Deposits: users can upload proof documents to deposits/ only
CREATE POLICY "private_insert_deposits"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-private'
  AND (storage.foldername(name))[1] = 'deposits'
);

-- 4b. Deposits: users can replace their own proof docs
CREATE POLICY "private_update_own_deposits"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-private'
  AND (storage.foldername(name))[1] = 'deposits'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'media-private'
  AND (storage.foldername(name))[1] = 'deposits'
  AND owner = auth.uid()
);

-- 4c. Deposits: users can view only their own uploaded proofs
CREATE POLICY "private_select_own_deposits"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media-private'
  AND (storage.foldername(name))[1] = 'deposits'
  AND owner = auth.uid()
);

-- NO DELETE policy for any user on media-private.
-- Users cannot delete proof documents (audit trail).
-- Only service_role (admin) can delete.

-- Watermarks: NO user-facing policies at all.
-- watermarks/ folder is only accessed via service_role key (admin).
-- This means watermarks are completely invisible to all authenticated users.
