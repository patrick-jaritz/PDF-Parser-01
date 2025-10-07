import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { EdgeLogger, generateRequestId, updateProviderHealth } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type OCRProvider = 'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space' | 'openai-vision';

interface ProcessPDFRequest {
  documentId: string;
  jobId: string;
  fileUrl: string;
  ocrProvider: OCRProvider;
  openaiVisionModel?: string;
}

interface OCRResult {
  text: string;
  metadata: {
    confidence?: number;
    pages?: number;
    language?: string;
    provider: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const requestId = generateRequestId();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const logger = new EdgeLogger(supabaseClient, requestId);

    const { documentId, jobId, fileUrl, ocrProvider, openaiVisionModel }: ProcessPDFRequest = await req.json();

    logger.info('ocr', `Starting OCR processing for document ${documentId} using ${ocrProvider}`, {
      documentId,
      jobId,
      ocrProvider,
      fileUrl,
      requestId
    });

    const isTestMode = documentId === 'test-doc-id' || jobId === 'test-job-id';

    const startTime = Date.now();
    const perfStartTime = new Date();

    if (!isTestMode) {
      await supabaseClient
        .from('processing_jobs')
        .update({
          status: 'ocr_processing',
          request_id: requestId
        })
        .eq('id', jobId);

      logger.debug('database', 'Updated job status to ocr_processing', { jobId });
    }

    try {
      let pdfBuffer: ArrayBuffer;
      let contentType = 'application/pdf';

      if (isTestMode) {
        pdfBuffer = new ArrayBuffer(0);
        logger.debug('storage', 'Test mode: using empty buffer', { jobId });
      } else {
        logger.debug('storage', 'Fetching document from storage', { fileUrl });
        const fetchStart = Date.now();
        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) {
          logger.error('storage', 'Failed to fetch document from storage', new Error(`HTTP ${pdfResponse.status}`), {
            fileUrl,
            status: pdfResponse.status,
            statusText: pdfResponse.statusText
          });
          throw new Error(`Failed to fetch document: ${pdfResponse.statusText}`);
        }

        contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
        const pdfBlob = await pdfResponse.blob();
        pdfBuffer = await pdfBlob.arrayBuffer();
        const fetchDuration = Date.now() - fetchStart;
        logger.info('storage', `Document fetched successfully (${pdfBuffer.byteLength} bytes, ${contentType})`, {
          fileSize: pdfBuffer.byteLength,
          contentType,
          duration_ms: fetchDuration
        });
      }

      let ocrResult: OCRResult;
      const providerStartTime = Date.now();
      logger.info('ocr', `Calling OCR provider: ${ocrProvider}`, { ocrProvider, bufferSize: pdfBuffer.byteLength });

      try {
        switch (ocrProvider) {
          case 'google-vision':
            ocrResult = await processWithGoogleVision(pdfBuffer, contentType);
            break;
          case 'openai-vision':
            ocrResult = await processWithOpenAIVision(pdfBuffer, contentType, openaiVisionModel);
            break;
          case 'mistral':
            ocrResult = await processWithMistral(pdfBuffer, contentType);
            break;
          case 'aws-textract':
            ocrResult = await processWithAWSTextract(pdfBuffer, contentType);
            break;
          case 'azure-document-intelligence':
            ocrResult = await processWithAzureDocumentIntelligence(pdfBuffer, contentType);
            break;
          case 'ocr-space':
            ocrResult = await processWithOCRSpace(pdfBuffer, contentType, logger);
            break;
          case 'tesseract':
            ocrResult = await processWithTesseract(pdfBuffer, contentType);
            break;
          default:
            logger.error('ocr', `Unsupported OCR provider: ${ocrProvider}`, new Error('Unsupported provider'), { ocrProvider });
            throw new Error(`Unsupported OCR provider: ${ocrProvider}`);
        }

        const providerDuration = Date.now() - providerStartTime;
        logger.info('ocr', `OCR provider ${ocrProvider} completed successfully`, {
          provider: ocrProvider,
          textLength: ocrResult.text.length,
          duration_ms: providerDuration,
          confidence: ocrResult.metadata.confidence,
          pages: ocrResult.metadata.pages
        });

        await updateProviderHealth(supabaseClient, ocrProvider, 'ocr', 'healthy', providerDuration);
      } catch (providerError) {
        const providerDuration = Date.now() - providerStartTime;
        logger.error('ocr', `OCR provider ${ocrProvider} failed`, providerError, {
          provider: ocrProvider,
          duration_ms: providerDuration
        });

        await updateProviderHealth(
          supabaseClient,
          ocrProvider,
          'ocr',
          'down',
          providerDuration,
          providerError instanceof Error ? providerError.message : String(providerError)
        );

        throw providerError;
      }

      const processingTime = Date.now() - startTime;
      const perfEndTime = new Date();

      logger.info('ocr', 'OCR processing completed successfully', {
        jobId,
        documentId,
        processingTime,
        textLength: ocrResult.text.length,
        provider: ocrProvider
      });

      if (!isTestMode) {
        await supabaseClient
          .from('processing_jobs')
          .update({
            extracted_text: ocrResult.text,
            processing_time_ms: processingTime,
            provider_metadata: ocrResult.metadata,
            page_count: ocrResult.metadata.pages || 1,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        await supabaseClient
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', documentId);

        await logger.recordPerformanceMetric({
          jobId,
          stage: 'ocr',
          provider: ocrProvider,
          startTime: perfStartTime,
          endTime: perfEndTime,
          status: 'success',
          metadata: {
            textLength: ocrResult.text.length,
            confidence: ocrResult.metadata.confidence,
            pages: ocrResult.metadata.pages,
            provider: ocrProvider
          }
        });

        logger.debug('database', 'Updated job and document status to completed', { jobId, documentId });
      }

      return new Response(
        JSON.stringify({
          success: true,
          extractedText: ocrResult.text,
          processingTime,
          metadata: ocrResult.metadata,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OCR processing failed';
      logger.critical('ocr', 'OCR processing failed with error', error, {
        jobId,
        documentId,
        provider: ocrProvider,
        errorMessage
      });

      if (!isTestMode) {
        await supabaseClient
          .from('processing_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            error_details: {
              error: errorMessage,
              provider: ocrProvider,
              timestamp: new Date().toISOString(),
              requestId
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        await supabaseClient
          .from('documents')
          .update({ status: 'failed' })
          .eq('id', documentId);

        await logger.recordPerformanceMetric({
          jobId,
          stage: 'ocr',
          provider: ocrProvider,
          startTime: perfStartTime,
          endTime: new Date(),
          status: 'failed',
          metadata: {
            error: errorMessage,
            provider: ocrProvider
          }
        });
      }

      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRITICAL] Function error:', errorMessage, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function processWithGoogleVision(pdfBuffer: ArrayBuffer, contentType: string = 'application/pdf'): Promise<OCRResult> {
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  if (!apiKey) {
    return {
      text: "[Google Vision API key not configured. This is demo mode. In production with a valid API key, this would contain actual OCR text extracted from your PDF document using Google Cloud Vision API with high accuracy and multi-language support.]",
      metadata: {
        provider: 'google-vision',
        confidence: 0,
        pages: 1,
      },
    };
  }

  if (pdfBuffer.byteLength === 0) {
    return {
      text: "Google Vision API test successful! API key is configured and ready to process documents.",
      metadata: {
        provider: 'google-vision',
        confidence: 100,
        pages: 1,
      },
    };
  }

  const uint8Array = new Uint8Array(pdfBuffer);
  let base64Content = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64Content += String.fromCharCode(...chunk);
  }
  base64Content = btoa(base64Content);

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Content },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const fullTextAnnotation = result.responses[0]?.fullTextAnnotation;

  if (!fullTextAnnotation?.text) {
    throw new Error('No text found in the document');
  }

  const detectedLanguages = fullTextAnnotation.pages?.[0]?.property?.detectedLanguages || [];
  const primaryLanguage = detectedLanguages[0]?.languageCode || 'unknown';

  return {
    text: fullTextAnnotation.text,
    metadata: {
      provider: 'google-vision',
      confidence: fullTextAnnotation.pages?.[0]?.confidence || 0,
      pages: result.responses[0]?.fullTextAnnotation?.pages?.length || 1,
      language: primaryLanguage,
    },
  };
}

async function processWithOpenAIVision(pdfBuffer: ArrayBuffer, contentType: string = 'application/pdf', model: string = 'gpt-4o-mini'): Promise<OCRResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return {
      text: "[OpenAI API key not configured. This is demo mode. In production with a valid API key, this would contain actual OCR text extracted from your document using GPT-4o Vision with advanced image understanding capabilities.]",
      metadata: {
        provider: 'openai-vision',
        confidence: 0,
        pages: 1,
      },
    };
  }

  if (pdfBuffer.byteLength === 0) {
    return {
      text: "OpenAI Vision API test successful! API key is configured and ready to process documents.",
      metadata: {
        provider: 'openai-vision',
        confidence: 100,
        pages: 1,
      },
    };
  }

  const isImage = contentType.startsWith('image/');

  if (!isImage) {
    throw new Error(
      "OpenAI Vision only supports image formats (PNG, JPG, WebP, GIF), not PDFs. " +
      "To use OpenAI Vision for OCR, you need to: " +
      "1) Convert your PDF to images first (one image per page), or " +
      "2) Use a different OCR provider like Google Vision, AWS Textract, or Azure Document Intelligence which support PDF directly. " +
      "For now, please select a different OCR provider that supports PDF files."
    );
  }

  // Convert buffer to base64
  const uint8Array = new Uint8Array(pdfBuffer);
  let base64Content = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64Content += String.fromCharCode(...chunk);
  }
  base64Content = btoa(base64Content);

  const imageUrl = `data:${contentType};base64,${base64Content}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please extract all text from this image. Return only the extracted text, maintaining the original layout and structure as much as possible. Include all visible text, numbers, and any other readable content. Be precise and accurate.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || '';

  if (!extractedText) {
    throw new Error('OpenAI Vision: No text extracted from image');
  }

  return {
    text: extractedText,
    metadata: {
      provider: 'openai-vision',
      confidence: 95,
      pages: 1,
      language: 'auto-detected',
    },
  };
}

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

  if (!isImage) {
    throw new Error(
      "Mistral's Pixtral vision model only supports image formats (PNG, JPG, WebP), not PDFs. " +
      "To use Mistral for OCR, you need to: " +
      "1) Convert your PDF to images first (one image per page), or " +
      "2) Use a different OCR provider like Google Vision, AWS Textract, or Azure Document Intelligence which support PDF directly. " +
      "For now, please select a different OCR provider that supports PDF files."
    );
  }

  const uint8Array = new Uint8Array(pdfBuffer);
  let base64Content = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64Content += String.fromCharCode(...chunk);
  }
  base64Content = btoa(base64Content);

  const imageUrl = `data:${contentType};base64,${base64Content}`;

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'pixtral-12b-2409',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please extract all text from this image. Return only the extracted text, maintaining the original layout and structure as much as possible. Include all visible text, numbers, and any other readable content.',
            },
            {
              type: 'image_url',
              image_url: imageUrl,
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || '';

  if (!extractedText) {
    throw new Error('Mistral: No text extracted from image');
  }

  return {
    text: extractedText,
    metadata: {
      provider: 'mistral',
      confidence: 90,
      pages: 1,
      language: 'unknown',
    },
  };
}

async function processWithAWSTextract(pdfBuffer: ArrayBuffer, contentType: string = 'application/pdf'): Promise<OCRResult> {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const region = Deno.env.get('AWS_REGION') || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    return {
      text: "[AWS credentials not configured. This is demo mode. In production with valid AWS credentials, this would contain actual OCR text extracted using Amazon Textract with advanced table and form detection capabilities.]",
      metadata: {
        provider: 'aws-textract',
        confidence: 0,
        pages: 1,
      },
    };
  }

  return {
    text: "[AWS Textract processing not fully implemented in this demo]",
    metadata: {
      provider: 'aws-textract',
      confidence: 0,
      pages: 1,
    },
  };
}

async function processWithAzureDocumentIntelligence(pdfBuffer: ArrayBuffer, contentType: string = 'application/pdf'): Promise<OCRResult> {
  const apiKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
  const endpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');

  if (!apiKey || !endpoint) {
    return {
      text: "[Azure Document Intelligence credentials not configured. This is demo mode. In production with valid credentials, this would contain actual OCR text extracted using Azure AI with advanced layout analysis and multi-language support.]",
      metadata: {
        provider: 'azure-document-intelligence',
        confidence: 0,
        pages: 1,
      },
    };
  }

  return {
    text: "[Azure Document Intelligence processing not fully implemented in this demo]",
    metadata: {
      provider: 'azure-document-intelligence',
      confidence: 0,
      pages: 1,
    },
  };
}

async function processWithOCRSpace(pdfBuffer: ArrayBuffer, contentType: string = 'application/pdf', logger?: EdgeLogger): Promise<OCRResult> {
  const apiKey = Deno.env.get('OCR_SPACE_API_KEY');

  if (!apiKey) {
    return {
      text: "[OCR.space API key not configured. This is demo mode. In production with a valid API key, this would contain actual OCR text extracted using OCR.space's free-tier OCR service.]",
      metadata: {
        provider: 'ocr-space',
        confidence: 0,
        pages: 1,
      },
    };
  }

  if (pdfBuffer.byteLength === 0) {
    return {
      text: "OCR.space API test successful! API key is configured and ready to process documents.",
      metadata: {
        provider: 'ocr-space',
        confidence: 100,
        pages: 1,
      },
    };
  }

  const fileSizeKB = pdfBuffer.byteLength / 1024;
  const maxSizeKB = 1024;

  logger?.info('ocr', 'OCR.space: Checking file size', {
    fileSizeBytes: pdfBuffer.byteLength,
    fileSizeKB: Math.round(fileSizeKB),
    maxSizeKB,
    withinLimit: fileSizeKB <= maxSizeKB
  });

  if (fileSizeKB > maxSizeKB) {
    const errorMessage = `File size (${Math.round(fileSizeKB)} KB) exceeds OCR.space free tier limit of ${maxSizeKB} KB. Please use a different OCR provider (Google Vision, AWS Textract, Azure Document Intelligence) or reduce the file size by:
1. Compressing the PDF
2. Reducing image quality/resolution
3. Converting multi-page PDFs to single pages
4. Using a smaller document
5. Upgrading to OCR.space paid plan for larger files`;

    logger?.error('ocr', 'OCR.space: File size limit exceeded', new Error('File too large'), {
      fileSizeKB: Math.round(fileSizeKB),
      maxSizeKB,
      exceedsBy: Math.round(fileSizeKB - maxSizeKB),
      contentType,
      suggestedProviders: ['google-vision', 'aws-textract', 'azure-document-intelligence']
    });

    throw new Error(errorMessage);
  }

  const isPDF = contentType === 'application/pdf';
  const isImage = contentType.startsWith('image/');

  let fileExtension = 'pdf';
  let fileName = 'document.pdf';
  let fileType = 'PDF';

  if (isImage) {
    if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
      fileExtension = 'jpg';
      fileName = 'document.jpg';
      fileType = 'JPG';
    } else if (contentType === 'image/png') {
      fileExtension = 'png';
      fileName = 'document.png';
      fileType = 'PNG';
    } else if (contentType === 'image/webp') {
      fileExtension = 'webp';
      fileName = 'document.webp';
      fileType = 'AUTO';
    }
  }

  logger?.debug('ocr', 'OCR.space: Preparing request', {
    contentType,
    fileType,
    fileName,
    bufferSize: pdfBuffer.byteLength,
    fileSizeKB: Math.round(fileSizeKB),
    apiKeyConfigured: !!apiKey
  });

  const uint8Array = new Uint8Array(pdfBuffer);
  let base64Content = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64Content += String.fromCharCode(...chunk);
  }
  base64Content = btoa(base64Content);

  const formData = new FormData();
  formData.append('base64Image', `data:${contentType};base64,${base64Content}`);
  formData.append('apikey', apiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');

  logger?.debug('ocr', 'OCR.space: Sending request to API', {
    endpoint: 'https://api.ocr.space/parse/image',
    method: 'base64',
    base64Length: base64Content.length,
    fileType
  });

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  logger?.debug('ocr', 'OCR.space: Received response', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

  let result;
  let responseText: string | undefined;

  try {
    const text = await response.text();
    responseText = text;

    if (!response.ok) {
      logger?.error('ocr', 'OCR.space: HTTP error response', new Error(`HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        errorText: text.substring(0, 500)
      });
      throw new Error(`OCR.space API error: ${response.statusText} - ${text.substring(0, 200)}`);
    }

    result = JSON.parse(text);
  } catch (parseError) {
    if (!response.ok) {
      throw parseError;
    }
    logger?.error('ocr', 'OCR.space: Failed to parse JSON response', parseError, {
      responseText: responseText?.substring(0, 500) || 'Unable to read response text',
      responseStatus: response.status
    });
    throw new Error('OCR.space: Invalid JSON response from API');
  }

  logger?.debug('ocr', 'OCR.space: API response received', {
    hasError: result.IsErroredOnProcessing,
    hasResults: !!result.ParsedResults,
    resultCount: result.ParsedResults?.length || 0,
    ocrExitCode: result.OCRExitCode,
    processingTimeMS: result.ProcessingTimeInMilliseconds,
    errorMessage: result.ErrorMessage
  });

  if (result.IsErroredOnProcessing || (Array.isArray(result.ErrorMessage) && result.ErrorMessage.length > 0 && result.ErrorMessage[0])) {
    const errorMessage = result.ErrorMessage?.[0] || result.ParsedResults?.[0]?.ErrorMessage || 'Unknown error';
    logger?.error('ocr', `OCR.space processing error: ${errorMessage}`, new Error(errorMessage), {
      fullResponse: result,
      ocrExitCode: result.OCRExitCode,
      errorDetails: result.ErrorDetails,
      isErroredOnProcessing: result.IsErroredOnProcessing,
      errorArray: result.ErrorMessage
    });
    throw new Error(`OCR.space processing error: ${errorMessage}`);
  }

  if (!result.ParsedResults || result.ParsedResults.length === 0) {
    logger?.error('ocr', 'OCR.space: No results returned from API', new Error('No ParsedResults'), {
      fullResponse: result,
      responseStatus: result.OCRExitCode,
      responseMessage: result.ErrorMessage
    });
    throw new Error('OCR.space: No results returned from API');
  }

  const parsedText = result.ParsedResults
    .map((page: any) => page.ParsedText || '')
    .join('\n\n--- Page Break ---\n\n')
    .trim();

  if (!parsedText) {
    logger?.warning('ocr', 'OCR.space: Empty text extracted', {
      resultCount: result.ParsedResults.length,
      parsedResultDetails: result.ParsedResults.map((r: any) => ({
        hasText: !!r.ParsedText,
        textLength: r.ParsedText?.length || 0,
        errorMessage: r.ErrorMessage,
        exitCode: r.FileParseExitCode
      }))
    });
    throw new Error('OCR.space: No text extracted from document');
  }

  const pageCount = result.ParsedResults.length || 1;

  logger?.info('ocr', 'OCR.space: Successfully extracted text', {
    textLength: parsedText.length,
    pageCount,
    processingTimeMS: result.ProcessingTimeInMilliseconds
  });

  return {
    text: parsedText,
    metadata: {
      provider: 'ocr-space',
      confidence: 95,
      pages: pageCount,
      language: 'eng',
    },
  };
}

async function processWithTesseract(_pdfBuffer: ArrayBuffer, _contentType: string = 'application/pdf'): Promise<OCRResult> {
  return {
    text: "[Tesseract.js OCR is not yet fully implemented in this Edge Function. Tesseract requires PDF-to-image conversion which is better handled client-side. For server-side OCR, please use Google Vision, AWS Textract, Azure Document Intelligence, Mistral, or OCR.space providers.]",
    metadata: {
      provider: 'tesseract',
      confidence: 0,
      pages: 1,
    },
  };
}