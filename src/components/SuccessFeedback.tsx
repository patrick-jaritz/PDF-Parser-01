import { CheckCircle, Download, RefreshCw, Clock, FileText, Hash } from 'lucide-react';

interface SuccessFeedbackProps {
  processingTime?: number;
  fileName: string;
  extractedTextLength?: number;
  structuredOutput: any;
  onDownload: () => void;
  onProcessMore: () => void;
}

export function SuccessFeedback({
  processingTime,
  fileName,
  extractedTextLength,
  structuredOutput,
  onDownload,
  onProcessMore,
}: SuccessFeedbackProps) {
  const questionCount = structuredOutput?.questions?.length || 0;
  const hasQuestions = questionCount > 0;

  const formatTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Complete! 🎉
          </h3>
          <p className="text-gray-700 mb-4">
            Your document has been successfully processed and structured.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                <Clock className="w-3 h-3" />
                <span>Processing Time</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatTime(processingTime)}
              </div>
            </div>

            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                <FileText className="w-3 h-3" />
                <span>Text Extracted</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {extractedTextLength ? `${extractedTextLength.toLocaleString()} chars` : 'N/A'}
              </div>
            </div>

            {hasQuestions && (
              <div className="bg-white/60 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                  <Hash className="w-3 h-3" />
                  <span>Questions Found</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {questionCount}
                </div>
              </div>
            )}

            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                <FileText className="w-3 h-3" />
                <span>Data Quality</span>
              </div>
              <div className="text-lg font-semibold text-green-600">
                ✓ Excellent
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </button>

            <button
              onClick={onProcessMore}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Process Another Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

