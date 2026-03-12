-- Storage RLS policies for the "media" bucket
-- Allow authenticated users to upload deposit proof files to deposits/ folder
-- Allow public read access to all files in the media bucket

-- 1. Ensure the media bucket exists (no-op if already there)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to upload files into deposits/ prefix
CREATE POLICY "Authenticated users can upload deposit proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'deposits'
);

-- 3. Allow users to update their own uploaded files
CREATE POLICY "Users can update own deposit proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'deposits'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'deposits'
);

-- 4. Allow public read access to all media files (bucket is public)
CREATE POLICY "Public read access for media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');
