import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface ProcessingState {
  status: 'idle' | 'uploading' | 'ocr_processing' | 'llm_processing' | 'completed' | 'failed';
  documentId?: string;
  jobId?: string;
  extractedText?: string;
  structuredOutput?: any;
  error?: string;
  processingTime?: number;
}

export function useDocumentProcessor() {
  const [state, setState] = useState<ProcessingState>({ status: 'idle' });

  const processDocument = useCallback(async (
    file: File,
    structureTemplate: any,
    ocrProvider: 'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space' | 'openai-vision' = 'google-vision',
    llmProvider: string = 'openai',
    openaiVisionModel: string = 'gpt-4o-mini',
    llmModel: string = 'gpt-4o-mini'
  ) => {
    const requestId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      logger.info('upload', 'Starting document processing', {
        fileName: file.name,
        fileSize: file.size,
        ocrProvider,
        llmProvider,
        requestId
      });
      setState({ status: 'uploading' });

      const uploadStartTime = new Date();

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `documents/${fileName}`;

      logger.debug('storage', 'Uploading file to storage', { filePath, fileSize: file.size });
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file);

      if (uploadError) {
        logger.error('storage', 'Storage upload failed', uploadError, {
          filePath,
          fileSize: file.size,
          errorCode: uploadError.message
        });
        throw uploadError;
      }

      logger.info('storage', 'File uploaded successfully', {
        filePath,
        uploadDuration: Date.now() - uploadStartTime.getTime()
      });
      const { data: { publicUrl } } = supabase.storage
        .from('pdfs')
        .getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();

      logger.debug('database', 'Creating document record', { publicUrl, userId: user?.id });
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_size: file.size,
          file_url: publicUrl,
          status: 'processing',
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (docError) {
        logger.error('database', 'Failed to create document record', docError, {
          fileName: file.name,
          fileSize: file.size
        });
        throw docError;
      }
      logger.info('database', 'Document record created', { documentId: document.id });

      logger.debug('database', 'Creating processing job', { documentId: document.id });
      const { data: job, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          document_id: document.id,
          structure_template: structureTemplate,
          ocr_provider: ocrProvider,
          llm_provider: llmProvider,
          status: 'pending',
          request_id: requestId,
        })
        .select()
        .single();

      if (jobError) {
        logger.error('database', 'Failed to create processing job', jobError, {
          documentId: document.id
        });
        throw jobError;
      }
      logger.info('database', 'Processing job created', { jobId: job.id, documentId: document.id });

      setState({
        status: 'ocr_processing',
        documentId: document.id,
        jobId: job.id,
      });

      // ========== VISION-BASED OCR PDF HANDLER START ==========
      // Special handling for Mistral/OpenAI Vision + PDF: Convert to images client-side
      const requiresImageConversion = (ocrProvider === 'mistral' || ocrProvider === 'openai-vision') && file.type === 'application/pdf';
      
      if (requiresImageConversion) {
        logger.info('ocr', `${ocrProvider} + PDF detected: Converting PDF to images client-side`, {
          fileName: file.name,
          fileSize: file.size,
          ocrProvider
        });

        // Import PDF to images converter
        const { pdfToImages } = await import('../lib/tesseractOCR');
        const images = await pdfToImages(file);
        const totalPages = images.length;

        logger.info('ocr', `PDF converted to ${totalPages} images`, {
          pages: totalPages,
          jobId: job.id,
          ocrProvider
        });

        const allText: string[] = [];
        let totalOcrTime = 0;

        // Process each page as an image through vision-based OCR
        for (let i = 0; i < images.length; i++) {
          const pageNum = i + 1;
          logger.debug('ocr', `Processing page ${pageNum}/${totalPages} with ${ocrProvider}`, {
            page: pageNum,
            totalPages,
            jobId: job.id,
            ocrProvider
          });

          // Convert data URL to blob
          const response = await fetch(images[i]);
          const blob = await response.blob();
          const imageFile = new File([blob], `${file.name}-page-${pageNum}.png`, { type: 'image/png' });

          // Upload this page with explicit content type
          const pageFilePath = `documents/${Date.now()}-page-${pageNum}.png`;
          const { error: pageUploadError } = await supabase.storage
            .from('pdfs')
            .upload(pageFilePath, imageFile, {
              contentType: 'image/png',
              upsert: false
            });

          if (pageUploadError) {
            throw new Error(`Failed to upload page ${pageNum}: ${pageUploadError.message}`);
          }

          const { data: { publicUrl: pageUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(pageFilePath);

          logger.debug('ocr', `Uploaded page ${pageNum} as PNG`, {
            pageUrl,
            contentType: 'image/png',
            filePath: pageFilePath,
            ocrProvider
          });

          // Process this page through vision-based OCR
          const pageOcrStart = Date.now();
          const pageOcrResponse = await fetch(
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
                ocrProvider: ocrProvider,
                openaiVisionModel: ocrProvider === 'openai-vision' ? openaiVisionModel : undefined,
              }),
            }
          );

          const pageOcrDuration = Date.now() - pageOcrStart;
          totalOcrTime += pageOcrDuration;

          if (!pageOcrResponse.ok) {
            const errorText = await pageOcrResponse.text();
            throw new Error(`${ocrProvider} OCR failed for page ${pageNum}: ${errorText}`);
          }

          const pageResult = await pageOcrResponse.json();
          allText.push(pageResult.extractedText);

          logger.debug('ocr', `Page ${pageNum} processed successfully`, {
            page: pageNum,
            textLength: pageResult.extractedText?.length || 0,
            duration_ms: pageOcrDuration,
            ocrProvider
          });
        }

        // Combine all pages
        const combinedText = allText.join('\n\n--- Page Break ---\n\n');
        const ocrResult = {
          extractedText: combinedText,
          processingTime: totalOcrTime
        };

        logger.info('ocr', `All pages processed with ${ocrProvider}`, {
          totalPages,
          totalTextLength: combinedText.length,
          totalOcrTime,
          jobId: job.id,
          ocrProvider
        });

        // Now continue with LLM processing
        setState({
          status: 'llm_processing',
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
        });

        logger.info('llm', 'Calling LLM Edge Function', {
          provider: llmProvider,
          jobId: job.id,
          textLength: ocrResult.extractedText?.length || 0
        });

        const llmStartTime = Date.now();
        console.log(`Calling LLM Edge Function (${ocrProvider} OCR)...`, { 
          jobId: job.id, 
          llmProvider, 
          textLength: ocrResult.extractedText?.length || 0,
          textPreview: ocrResult.extractedText?.substring(0, 200)
        });

        const llmResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-structured-output`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              jobId: job.id,
              extractedText: ocrResult.extractedText,
              structureTemplate,
              llmProvider,
              llmModel,
            }),
          }
        );

        const llmDuration = Date.now() - llmStartTime;
        console.log(`LLM Response received (${ocrProvider} OCR):`, llmResponse.status);

        if (!llmResponse.ok) {
          const errorText = await llmResponse.text();
          logger.error('llm', 'LLM API request failed', new Error(`HTTP ${llmResponse.status}`), {
            status: llmResponse.status,
            statusText: llmResponse.statusText,
            body: errorText.substring(0, 500),
            provider: llmProvider,
            jobId: job.id,
            duration_ms: llmDuration
          });
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          throw new Error(errorData.error || `LLM processing failed: ${llmResponse.statusText}`);
        }

        console.log(`Parsing LLM response (${ocrProvider} OCR)...`);
        const llmResult = await llmResponse.json();
        console.log(`LLM Result (${ocrProvider} OCR):`, llmResult);
        console.log('Has demo note?', !!llmResult.structuredOutput?._demo_note);
        
        logger.info('llm', 'LLM processing completed', {
          processingTime: llmResult.processingTime,
          provider: llmProvider,
          jobId: job.id,
          duration_ms: llmDuration,
          hasOutput: !!llmResult.structuredOutput,
          isDemoData: !!llmResult.structuredOutput?._demo_note
        });

        const totalProcessingTime = ocrResult.processingTime + llmResult.processingTime;

        logger.info('system', 'Document processing completed successfully', {
          totalProcessingTime,
          documentId: document.id,
          jobId: job.id,
          ocrProvider,
          llmProvider,
          requestId
        });

        setState({
          status: 'completed',
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
          structuredOutput: llmResult.structuredOutput,
          processingTime: totalProcessingTime,
        });

        return {
          success: true,
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
          structuredOutput: llmResult.structuredOutput,
          processingTime: totalProcessingTime,
        };
      }
      // ========== VISION-BASED OCR PDF HANDLER END ==========

      logger.info('ocr', 'Calling OCR Edge Function', {
        provider: ocrProvider,
        jobId: job.id,
        documentId: document.id
      });

      const ocrStartTime = Date.now();
      const ocrResponse = await fetch(
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
            fileUrl: publicUrl,
            ocrProvider,
          }),
        }
      );

      const ocrDuration = Date.now() - ocrStartTime;

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        logger.error('ocr', 'OCR API request failed', new Error(`HTTP ${ocrResponse.status}`), {
          status: ocrResponse.status,
          statusText: ocrResponse.statusText,
          body: errorText.substring(0, 500),
          provider: ocrProvider,
          jobId: job.id,
          duration_ms: ocrDuration
        });
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `OCR processing failed: ${ocrResponse.statusText}`);
      }

      const ocrResult = await ocrResponse.json();
      logger.info('ocr', 'OCR processing completed', {
        textLength: ocrResult.extractedText?.length || 0,
        processingTime: ocrResult.processingTime,
        provider: ocrProvider,
        jobId: job.id,
        duration_ms: ocrDuration
      });

      setState({
        status: 'llm_processing',
        documentId: document.id,
        jobId: job.id,
        extractedText: ocrResult.extractedText,
      });

      logger.info('llm', 'Calling LLM Edge Function', {
        provider: llmProvider,
        jobId: job.id,
        textLength: ocrResult.extractedText?.length || 0
      });

      const llmStartTime = Date.now();
      const llmResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-structured-output`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            jobId: job.id,
            extractedText: ocrResult.extractedText,
            structureTemplate,
            llmProvider,
          }),
        }
      );

      const llmDuration = Date.now() - llmStartTime;

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        logger.error('llm', 'LLM API request failed', new Error(`HTTP ${llmResponse.status}`), {
          status: llmResponse.status,
          statusText: llmResponse.statusText,
          body: errorText.substring(0, 500),
          provider: llmProvider,
          jobId: job.id,
          duration_ms: llmDuration
        });
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `LLM processing failed: ${llmResponse.statusText}`);
      }

      const llmResult = await llmResponse.json();
      logger.info('llm', 'LLM processing completed', {
        processingTime: llmResult.processingTime,
        provider: llmProvider,
        jobId: job.id,
        duration_ms: llmDuration,
        hasOutput: !!llmResult.structuredOutput
      });

      const totalProcessingTime = ocrResult.processingTime + llmResult.processingTime;

      logger.info('system', 'Document processing completed successfully', {
        totalProcessingTime,
        documentId: document.id,
        jobId: job.id,
        ocrProvider,
        llmProvider,
        requestId
      });

      setState({
        status: 'completed',
        documentId: document.id,
        jobId: job.id,
        extractedText: ocrResult.extractedText,
        structuredOutput: llmResult.structuredOutput,
        processingTime: totalProcessingTime,
      });

      return {
        success: true,
        documentId: document.id,
        jobId: job.id,
        extractedText: ocrResult.extractedText,
        structuredOutput: llmResult.structuredOutput,
        processingTime: totalProcessingTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      logger.critical('system', 'Document processing failed', error, {
        errorMessage,
        fileName: file.name,
        ocrProvider,
        llmProvider,
        requestId
      });

      setState({
        status: 'failed',
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const processWithExtractedText = useCallback(async (
    file: File,
    extractedText: string,
    metadata: { confidence: number; pages: number },
    structureTemplate: any,
    llmProvider: string = 'openai',
    llmModel: string = 'gpt-4o-mini'
  ) => {
    const requestId = `client_tesseract_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      logger.info('ocr', 'Processing with client-side extracted text (Tesseract)', {
        fileName: file.name,
        textLength: extractedText.length,
        confidence: metadata.confidence,
        pages: metadata.pages,
        llmProvider,
        requestId,
        ocrProvider: 'tesseract'
      });

      setState({ status: 'llm_processing' });

      const { data: { user } } = await supabase.auth.getUser();

      logger.debug('database', 'Creating document record for Tesseract result');
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_size: file.size,
          file_url: 'tesseract://local',
          status: 'completed',
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (docError) {
        logger.error('database', 'Failed to create document record', docError);
        throw docError;
      }

      const { data: job, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          document_id: document.id,
          structure_template: structureTemplate,
          ocr_provider: 'tesseract',
          llm_provider: llmProvider,
          extracted_text: extractedText,
          status: 'completed',
          request_id: requestId,
          provider_metadata: {
            confidence: metadata.confidence,
            pages: metadata.pages,
            provider: 'tesseract',
          },
          page_count: metadata.pages,
        })
        .select()
        .single();

      if (jobError) {
        logger.error('database', 'Failed to create processing job', jobError);
        throw jobError;
      }

      setState({
        status: 'llm_processing',
        documentId: document.id,
        jobId: job.id,
        extractedText: extractedText,
      });

      logger.info('llm', 'Calling LLM Edge Function with Tesseract text', {
        provider: llmProvider,
        jobId: job.id,
        textLength: extractedText.length
      });

      const llmStartTime = Date.now();
      console.log('Calling LLM Edge Function...', { jobId: job.id, llmProvider, textLength: extractedText.length });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('LLM request timeout after 5 minutes');
        controller.abort();
      }, 300000); // 5 minute timeout (increased from 2 minutes)
      
      let llmResponse;
      try {
        llmResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-structured-output`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              jobId: job.id,
              extractedText: extractedText,
              structureTemplate,
              llmProvider,
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        console.log('LLM Response received:', llmResponse.status);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timed out after 5 minutes. The LLM service may be overloaded or unavailable. Please try again later.');
        }
        throw error;
      }

      const llmDuration = Date.now() - llmStartTime;

      console.log('LLM Response status:', llmResponse.status, llmResponse.statusText);
      
      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        console.error('LLM Error Response:', errorText);
        logger.error('llm', 'LLM API request failed', new Error(`HTTP ${llmResponse.status}`), {
          status: llmResponse.status,
          body: errorText.substring(0, 500),
          duration_ms: llmDuration
        });
        throw new Error(`LLM processing failed: ${llmResponse.statusText}`);
      }

      console.log('Parsing LLM response...');
      const llmResult = await llmResponse.json();
      console.log('LLM Result:', llmResult);
      logger.info('llm', 'LLM processing completed with Tesseract text', {
        processingTime: llmResult.processingTime,
        duration_ms: llmDuration,
        hasStructuredOutput: !!llmResult.structuredOutput,
        outputKeys: llmResult.structuredOutput ? Object.keys(llmResult.structuredOutput) : []
      });

      setState({
        status: 'completed',
        documentId: document.id,
        jobId: job.id,
        extractedText: extractedText,
        structuredOutput: llmResult.structuredOutput,
        processingTime: llmResult.processingTime,
      });

      return {
        success: true,
        documentId: document.id,
        jobId: job.id,
        extractedText: extractedText,
        structuredOutput: llmResult.structuredOutput,
        processingTime: llmResult.processingTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      logger.critical('system', 'Tesseract document processing failed', error, {
        errorMessage,
        fileName: file.name,
        requestId
      });

      setState({
        status: 'failed',
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    ...state,
    processDocument,
    processWithExtractedText,
    reset,
    setState,
  };
}
