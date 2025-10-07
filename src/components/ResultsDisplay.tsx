import { useState } from 'react';
import { Download, Copy, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { UserFriendlyError } from './UserFriendlyError';
import { ProcessingProgress } from './ProcessingProgress';
import { SuccessFeedback } from './SuccessFeedback';

interface ResultsDisplayProps {
  status: 'pending' | 'ocr_processing' | 'llm_processing' | 'completed' | 'failed';
  extractedText?: string;
  structuredOutput?: any;
  error?: string;
  processingTime?: number;
}

export function ResultsDisplay({
  status,
  extractedText,
  structuredOutput,
  error,
  processingTime,
}: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<'structured' | 'raw'>('structured');
  const [copiedStructured, setCopiedStructured] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const handleCopy = async (text: string, type: 'structured' | 'raw') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'structured') {
        setCopiedStructured(true);
        setTimeout(() => setCopiedStructured(false), 2000);
      } else {
        setCopiedRaw(true);
        setTimeout(() => setCopiedRaw(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = (data: string, filename: string, type: string = 'application/json') => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any): string => {
    if (!data || !data.questions || !Array.isArray(data.questions)) {
      return '';
    }

    const headers = [
      'Question Number',
      'Question',
      'Answer 1',
      'Answer 2',
      'Answer 3',
      'Answer 4',
      'Answer 5',
      'Correct Answer',
      'Tags'
    ];

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = data.questions.map((q: any) => [
      escapeCSV(q.question_number || ''),
      escapeCSV(q.question || ''),
      escapeCSV(q.answer_1 || ''),
      escapeCSV(q.answer_2 || ''),
      escapeCSV(q.answer_3 || ''),
      escapeCSV(q.answer_4 || ''),
      escapeCSV(q.answer_5 || ''),
      escapeCSV(q.correct_answer || ''),
      escapeCSV(Array.isArray(q.tags) ? q.tags.join('; ') : '')
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const hasQuestions = structuredOutput?.questions && Array.isArray(structuredOutput.questions);

  if (status === 'pending') {
    return (
      <div className="w-full p-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Ready to Process</p>
            <p className="text-gray-600">Upload a document and select a template to see your results here</p>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Step 1: Upload</span>
            </div>
            <span>→</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span>Step 2: Template</span>
            </div>
            <span>→</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span>Step 3: Process</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ocr_processing' || status === 'llm_processing') {
    return (
      <ProcessingProgress
        status={status}
        processingTime={processingTime}
        fileName="Document"
      />
    );
  }

  if (status === 'failed') {
    return (
      <UserFriendlyError
        error={error || 'An unknown error occurred while processing your document.'}
        context={{
          fileName: "Document",
          provider: "OCR Provider"
        }}
        onRetry={() => {
          // This would trigger a retry in the parent component
          console.log('Retry processing');
        }}
      />
    );
  }

  if (status === 'completed' && structuredOutput) {
    const structuredJson = JSON.stringify(structuredOutput, null, 2);

    return (
      <div className="w-full space-y-4">
        <SuccessFeedback
          processingTime={processingTime}
          fileName="Document"
          extractedTextLength={extractedText?.length}
          structuredOutput={structuredOutput}
          onDownload={() => handleDownload(structuredJson, 'structured-output.json')}
          onProcessMore={() => {
            // Reset the processing state
            window.location.reload();
          }}
        />

        <div className="border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('structured')}
              className={`
                px-4 py-2 font-medium text-sm transition-colors border-b-2
                ${
                  activeTab === 'structured'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Structured Data
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`
                px-4 py-2 font-medium text-sm transition-colors border-b-2
                ${
                  activeTab === 'raw'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Raw OCR Text
            </button>
          </div>
        </div>

        {activeTab === 'structured' ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Extracted Data (JSON)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(structuredJson, 'structured')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                >
                  {copiedStructured ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload(structuredJson, 'structured-output.json')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </button>
                {hasQuestions && (
                  <button
                    onClick={() => handleDownload(convertToCSV(structuredOutput), 'exam-questions.csv', 'text/csv')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                )}
              </div>
            </div>
            <pre className="p-4 text-sm text-gray-800 overflow-x-auto max-h-96 overflow-y-auto font-mono">
              {structuredJson}
            </pre>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Raw Extracted Text</span>
              <button
                onClick={() => handleCopy(extractedText || '', 'raw')}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
              >
                {copiedRaw ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-4 text-sm text-gray-800 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
              {extractedText || 'No raw text available'}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
