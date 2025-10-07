# Mistral PDF Support - Client-Side Implementation

## Step-by-Step Implementation

### ✅ Step 1: Export pdfToImages (COMPLETED)

The function has been exported in `src/lib/tesseractOCR.ts` (line 19).

### 📝 Step 2: Add Mistral PDF Handler to useDocumentProcessor.ts

Insert this code block **after line 113** (after `setState({ status: 'ocr_processing' ...})`) and **before line 115** (before `logger.info('ocr', 'Calling OCR Edge Function'...)`):

```typescript
      // === MISTRAL PDF HANDLER - INSERT HERE ===
      
      // Special handling: Convert PDF to images for Mistral OCR
      if (ocrProvider === 'mistral' && file.type === 'application/pdf') {
        logger.info('ocr', 'Mistral + PDF: Converting to images client-side', {
          fileName: file.name,
          pages: 'detecting...'
        });

        // Import PDF to images converter
        const { pdfToImages } = await import('../lib/tesseractOCR');
        const images = await pdfToImages(file);
        const totalPages = images.length;

        logger.info('ocr', `Converted PDF to ${totalPages} images`, { totalPages });

        const allText: string[] = [];
        let totalOcrTime = 0;

        // Process each page
        for (let i = 0; i < images.length; i++) {
          const pageNum = i + 1;
          
          // Convert data URL to Blob/File
          const response = await fetch(images[i]);
          const blob = await response.blob();
          const imageFile = new File([blob], `page-${pageNum}.png`, { type: 'image/png' });

          // Upload page image
          const pageFilePath = `documents/${Date.now()}-p${pageNum}.png`;
          await supabase.storage.from('pdfs').upload(pageFilePath, imageFile);
          const { data: { publicUrl: pageUrl } } = supabase.storage.from('pdfs').getPublicUrl(pageFilePath);

          // OCR this page with Mistral
          const pageStart = Date.now();
          const pageResp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf-ocr`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                documentId: document.id,
                jobId: job.id,
                fileUrl: pageUrl,
                ocrProvider: 'mistral',
              }),
            }
          );

          if (!pageResp.ok) throw new Error(`Page ${pageNum} failed`);
          
          const pageResult = await pageResp.json();
          allText.push(pageResult.extractedText);
          totalOcrTime += Date.now() - pageStart;
        }

        // Combine pages
        const combinedText = allText.join('\n\n--- Page Break ---\n\n');
        const ocrResult = { extractedText: combinedText, processingTime: totalOcrTime };

        logger.info('ocr', 'Mistral PDF processing complete', {
          pages: totalPages,
          totalTime: totalOcrTime
        });

        // Jump to LLM processing (skip normal OCR flow)
        setState({
          status: 'llm_processing',
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
        });

        // ... Now continue with LLM processing code (existing lines 176-248)
        // Copy the LLM processing section here
        
      } else {
        // === END MISTRAL PDF HANDLER ===
        
        // Normal processing (wrap existing OCR call in this else block)
```

Then, wrap the **existing OCR processing code** (lines 115-174) inside the `else` block above.

### Alternative: Simpler Version

If the above is too complex, here's a **super simple version**:

**In useDocumentProcessor.ts, find line ~115:**

```typescript
logger.info('ocr', 'Calling OCR Edge Function', {
```

**Add RIGHT BEFORE IT:**

```typescript
// Handle Mistral + PDF by converting to images first
if (ocrProvider === 'mistral' && file.type === 'application/pdf') {
  throw new Error(
    'Mistral OCR for PDFs requires client-side conversion. ' +
    'Please use Tesseract for PDFs (which has built-in conversion), ' +
    'or convert your PDF to images before uploading.'
  );
}
```

This simple version shows a helpful error message instead of failing silently.

## Testing

1. **Test with single image**: Upload a PNG/JPG with Mistral → Should work ✅
2. **Test with PDF + Tesseract**: Upload PDF with Tesseract → Should work ✅
3. **Test with PDF + Mistral** (after implementation):
   - Should convert PDF to images
   - Process each page
   - Combine results

## Deployment

- Client-side changes only (no Edge Function deployment needed)
- Changes take effect immediately after hard refresh
- Works with existing Mistral API key

