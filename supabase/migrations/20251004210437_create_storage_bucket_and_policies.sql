/*
  # Create Storage Bucket for PDFs with Security Policies

  ## Overview
  Creates a Supabase Storage bucket for PDF file uploads with appropriate
  access policies for both authenticated and anonymous users.

  ## Changes

  ### Storage Bucket: pdfs
  - Public access enabled for easy file retrieval
  - 50MB file size limit per upload
  - Only PDF MIME types allowed
  - Files accessible via public URLs

  ## Security

  ### Storage Policies
  - Anonymous users can upload PDFs (INSERT)
  - Authenticated users can upload PDFs (INSERT)
  - Anyone can read PDFs via public URLs (SELECT)
  - Users can only delete their own files
  - Service role has full access for cleanup operations

  ## Important Notes
  - Public bucket allows direct file access without authentication
  - RLS policies ensure users can only manage their own uploads
  - Automatic URL generation for uploaded files
*/

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for anonymous users
CREATE POLICY "Anonymous users can upload PDFs"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'pdfs' AND
    (storage.foldername(name))[1] = 'documents'
  );

CREATE POLICY "Anyone can read PDFs"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'pdfs');

-- Storage policies for authenticated users
CREATE POLICY "Authenticated users can upload PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdfs' AND
    (storage.foldername(name))[1] = 'documents'
  );

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pdfs' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Storage policy for service role cleanup
CREATE POLICY "Service role can manage all PDFs"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'pdfs')
  WITH CHECK (bucket_id = 'pdfs');
