-- Fix the 3 actual security issues in storage
-- These are the ONLY real security problems

-- Remove existing storage policies that allow public access
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their images" ON storage.objects;

-- Create properly secured storage policies
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can view images" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can delete their images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);