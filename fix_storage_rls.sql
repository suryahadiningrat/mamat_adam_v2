-- ============================================================
-- Fix Storage Upload RLS Policy for 'product_images' bucket
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow Public Read Access (so images can be viewed in the app)
CREATE POLICY "Public Access for product_images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product_images' );

-- 3. Allow Inserts (authenticated or anon, since the API route uses the anon key without a user session context)
CREATE POLICY "Allow Uploads to product_images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product_images' );

-- 4. Allow Updates/Deletes if needed later
CREATE POLICY "Allow Updates to product_images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'product_images' );

CREATE POLICY "Allow Deletes from product_images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'product_images' );
