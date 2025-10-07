import { useState } from 'react';
import { processPDFWithTesseract, processImageWithTesseract, TesseractProgress } from '../lib/tesseractOCR';
import { Loader2, FileText, Image } from 'lucide-react';

interface TesseractProcessorProps {
  file: File;
  onComplete: (text: string, metadata: { confidence: number; pages: number }) => void;
  onError: (error: string) => void;
}

export function TesseractProcessor({ file, onComplete, onError }: TesseractProcessorProps) {
  const [progress, setProgress] = useState<TesseractProgress>({
    status: 'Starting',
    progress: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const isPDF = file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');

  const startProcessing = async () => {
    setIsProcessing(true);
    try {
      if (isPDF) {
        const result = await processPDFWithTesseract(file, setProgress);
        onComplete(result.text, {
          confidence: result.confidence,
          pages: result.pages,
        });
      } else if (isImage) {
        const result = await processImageWithTesseract(file, setProgress);
        onComplete(result.text, {
          confidence: result.confidence,
          pages: result.pages,
        });
      } else {
        onError('Unsupported file type. Please upload a PDF or image file.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'OCR processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isPDF && !isImage) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          Tesseract.js only supports PDF and image files (PNG, JPG, WebP).
        </p>
      </div>
    );
  }

  if (!isProcessing) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {isPDF ? (
              <FileText className="h-10 w-10 text-blue-600" />
            ) : (
              <Image className="h-10 w-10 text-blue-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Client-Side OCR with Tesseract.js
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              {isPDF
                ? `This will process your ${file.name} locally in your browser. The PDF will be converted to images and then processed with Tesseract.js. No data is sent to any server during OCR.`
                : `This will process your ${file.name} locally in your browser using Tesseract.js. No data is sent to any server during OCR.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={startProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start OCR Processing
              </button>
            </div>
            <div className="mt-4 p-3 bg-white rounded border border-blue-200">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> Tesseract.js runs entirely in your browser. It may take
                longer than cloud-based OCR services but keeps your data completely private.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        <h3 className="text-lg font-semibold text-gray-900">Processing with Tesseract.js</h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{progress.status}</span>
            <span className="text-sm text-gray-600">{Math.round(progress.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>

        {progress.currentPage && progress.totalPages && (
          <div className="text-sm text-gray-600">
            Processing page {progress.currentPage} of {progress.totalPages}
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs text-gray-600">
            Tesseract.js is processing your document locally. This may take a few moments
            depending on the size and complexity of your document.
          </p>
        </div>
      </div>
    </div>
  );
}
