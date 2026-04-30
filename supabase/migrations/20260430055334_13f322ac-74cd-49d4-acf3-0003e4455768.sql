-- Create public videos storage bucket for browser-rendered videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for the videos bucket
CREATE POLICY "Videos: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Videos: authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Videos: users update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Videos: users delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);