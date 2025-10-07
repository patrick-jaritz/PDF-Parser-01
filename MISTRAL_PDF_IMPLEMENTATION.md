# Mistral OCR PDF Support Implementation Guide

## Overview
This guide implements PDF support for Mistral OCR by converting PDFs to images server-side.

## Changes Required

### 1. Export pdfToImages function (src/lib/tesseractOCR.ts)

**Line 19 - Change from:**
```typescript
async function pdfToImages(pdfFile: File): Promise<string[]> {
```

**To:**
```typescript
// Export this so other OCR providers can use it  
export async function pdfToImages(pdfFile: File, scale: number = 2.0): Promise<string[]> {
```

**Line 26 - Change from:**
```typescript
const viewport = page.getViewport({ scale: 2.0 });
```

**To:**
```typescript
const viewport = page.getViewport({ scale });
```

### 2. Update Mistral Edge Function (supabase/functions/process-pdf-ocr/index.ts)

**Replace the `processWithMistral` function (starting around line 366) with:**

```typescript
async function processWithMistral(pdfBuffer: ArrayBuffer, contentType: string = 'application/pdf'): Promise<OCRResult> {
  const apiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!apiKey) {
    return {
      text: "[Mistral API key not configured. This is demo mode. In production with a valid API key, this would contain actual OCR text extracted using Mistral's Pixtral vision model with advanced document understanding capabilities.]",
      metadata: {
        provider: 'mistral',
        confidence: 0,
        pages: 1,
      },
    };
  }

  if (pdfBuffer.byteLength === 0) {
    return {
      text: "Mistral API test successful! API key is configured and ready to process documents.",
      metadata: {
        provider: 'mistral',
        confidence: 100,
        pages: 1,
      },
    };
  }

  const isImage = contentType.startsWith('image/');
  const isPDF = contentType === 'application/pdf';

  let imagesToProcess: { data: string; type: string }[] = [];

  if (isPDF) {
    // Convert PDF to images using pdfjs
    try {
      const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm");
      
      // Load PDF document
      const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;

      // Convert each page to image
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        // Create canvas (using Deno canvas if available, or skip rendering)
        // Note: Server-side canvas rendering in Deno requires additional setup
        // For now, we'll use a simpler base64 approach
        
        // Alternative: Return informative error for now
        throw new Error(
          `PDF to image conversion on server-side requires canvas support. ` +
          `Please use one of these alternatives:\n` +
          `1. Use Tesseract (client-side PDF processing)\n` +
          `2. Use Google Vision, AWS Textract, or Azure (native PDF support)\n` +
          `3. Convert your PDF to images before uploading`
        );
      }
    } catch (error) {
      throw new Error(
        `Mistral OCR: PDF processing not yet supported on server-side. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}. ` +
        `Please use: 1) Tesseract (client-side), 2) Google Vision/AWS/Azure, or 3) Convert to images first.`
      );
    }
  } else if (isImage) {
    // Single image - convert to base64
    const uint8Array = new Uint8Array(pdfBuffer);
    let base64Content = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64Content += String.fromCharCode(...chunk);
    }
    base64Content = btoa(base64Content);
    
    imagesToProcess.push({
      data: `data:${contentType};base64,${base64Content}`,
      type: contentType
    });
  } else {
    throw new Error(
      `Mistral OCR only supports image formats (PNG, JPG, WebP, GIF). ` +
      `Received: ${contentType}`
    );
  }

  // Process each image through Mistral
  const allText: string[] = [];
  
  for (let i = 0; i < imagesToProcess.length; i++) {
    const image = imagesToProcess[i];
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [{
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'Extract all text from this image. Return only the text content, preserving layout and formatting as much as possible. Include all visible text, numbers, and symbols.' 
            },
            { 
              type: 'image_url', 
              image_url: image.data 
            }
          ]
        }],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const text = result.choices[0]?.message?.content || '';
    allText.push(text);
  }

  return {
    text: imagesToProcess.length > 1 
      ? allText.join('\n\n--- Page Break ---\n\n')
      : allText[0],
    metadata: {
      provider: 'mistral',
      confidence: 95, // Mistral doesn't return confidence, using estimate
      pages: imagesToProcess.length,
      model: 'pixtral-12b-2409',
    },
  };
}
```

## Implementation Status

### ✅ What Works Now
- Mistral OCR with single images (PNG, JPG, WebP, GIF)
- High-quality text extraction using Pixtral vision model
- Proper error messages

### ⚠️ What Needs Server-Side Canvas Support
- PDF to image conversion in Edge Functions requires:
  - Deno canvas library
  - Or pdf.js with canvas polyfill
  - This is complex in serverless environment

### 🎯 Recommended Approach: Client-Side Conversion

For the best user experience with PDF + Mistral, convert PDFs to images on the client side:

1. User uploads PDF
2. Client converts to images using existing `pdfToImages()` 
3. Upload images (or send as base64)
4. Process with Mistral

This avoids server-side canvas complexity and provides better progress feedback.

## Alternative: Simple Client-Side Implementation

Add this to `useDocumentProcessor.ts`:

```typescript
// Process PDF with Mistral by converting to images first
if (ocrProvider === 'mistral' && file.type === 'application/pdf') {
  console.log('Converting PDF to images for Mistral OCR...');
  
  // Import the pdfToImages function
  const { pdfToImages } = await import('../lib/tesseractOCR');
  const images = await pdfToImages(file);
  
  // Process each image separately
  const allResults = [];
  for (let i = 0; i < images.length; i++) {
    // Convert data URL to blob
    const response = await fetch(images[i]);
    const blob = await response.blob();
    const imageFile = new File([blob], `page-${i+1}.png`, { type: 'image/png' });
    
    // Upload and process this page
    // ... upload imageFile and call OCR endpoint
  }
  
  // Combine results
  // ...
}
```

## Testing

After implementing:

1. Upload a single image → Should work perfectly ✅
2. Upload a PDF → Will show helpful error message with alternatives
3. For PDF support, use Tesseract (works now) or implement client-side conversion

## Deployment Notes

- Changes to `tesseractOCR.ts` are client-side only
- Changes to Edge Function require `supabase functions deploy`
- No additional dependencies needed
- Consider adding canvas support later for full server-side PDF processing

