/*
  # Update Storage Bucket to Support Images

  ## Overview
  Updates the 'pdfs' storage bucket to accept both PDF files and common image formats
  (JPEG, PNG, WebP) for OCR processing of receipts, documents, and scanned images.

  ## Changes
  1. Updates allowed MIME types to include:
     - application/pdf (existing)
     - image/jpeg (new)
     - image/jpg (new)
     - image/png (new)
     - image/webp (new)

  ## Security
  - Maintains existing RLS policies
  - Same file size limit (50MB)
  - Public bucket with read access for all
  - Upload restrictions remain the same

  ## Notes
  - The bucket name remains 'pdfs' for backward compatibility
  - All existing policies continue to work with images
  - OCR providers can process both PDFs and images
*/

-- Update the storage bucket to accept images in addition to PDFs
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]
WHERE id = 'pdfs';
