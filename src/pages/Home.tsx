import { useState } from 'react';
import { FileSearch, Settings, AlertCircle, BookOpen, X, GitBranch, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DocumentUploader } from '../components/DocumentUploader';
import { TemplateEditor } from '../components/TemplateEditor';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { TesseractProcessor } from '../components/TesseractProcessor';
import { SimplifiedDashboard } from '../components/SimplifiedDashboard';
import { useDocumentProcessor } from '../hooks/useDocumentProcessor';

export function Home() {
  const [useNewInterface, setUseNewInterface] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [ocrProvider, setOcrProvider] = useState<'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space'>('google-vision');
  const [llmProvider, setLlmProvider] = useState<'openai' | 'anthropic' | 'mistral-large'>('openai');
  const [showSettings, setShowSettings] = useState(true);
  const [tesseractText, setTesseractText] = useState<string | null>(null);
  const [tesseractMetadata, setTesseractMetadata] = useState<{ confidence: number; pages: number } | null>(null);
  const [showTesseractProcessor, setShowTesseractProcessor] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(true);

  const {
    status,
    extractedText,
    structuredOutput,
    error,
    processingTime,
    processDocument,
    processWithExtractedText,
    reset,
  } = useDocumentProcessor();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setTesseractText(null);
    setTesseractMetadata(null);
    setShowTesseractProcessor(false);
    reset();

    if (ocrProvider === 'ocr-space') {
      const fileSizeKB = file.size / 1024;
      if (fileSizeKB > 1024) {
        alert(`Warning: File size is ${Math.round(fileSizeKB)} KB, which exceeds OCR.space's 1MB (1024 KB) limit.\n\nPlease either:\n1. Choose a different OCR provider (Google Vision, AWS Textract, Azure)\n2. Compress your file to under 1MB\n3. Upload a smaller document`);
      }
    }
  };

  const handleTesseractComplete = (text: string, metadata: { confidence: number; pages: number }) => {
    setTesseractText(text);
    setTesseractMetadata(metadata);
    setShowTesseractProcessor(false);
  };

  const handleTesseractError = () => {
    setShowTesseractProcessor(false);
    reset();
  };

  const handleProcessDocument = async () => {
    if (!selectedFile || !selectedTemplate) return;

    if (ocrProvider === 'tesseract') {
      if (tesseractText) {
        await processWithExtractedText(selectedFile, tesseractText, tesseractMetadata!, selectedTemplate, llmProvider);
      } else {
        setShowTesseractProcessor(true);
      }
    } else {
      await processDocument(selectedFile, selectedTemplate, ocrProvider, llmProvider);
    }
  };

  const canProcess = selectedFile && selectedTemplate && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'ocr_processing' || status === 'llm_processing';

  // Use new simplified dashboard if enabled
  if (useNewInterface) {
    return (
      <div>
        {/* Interface toggle - remove this in production */}
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
          <button
            onClick={() => setUseNewInterface(!useNewInterface)}
            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1"
          >
            {useNewInterface ? 'Switch to Old Interface' : 'Switch to New Interface'}
          </button>
        </div>
        <SimplifiedDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileSearch className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  PDF OCR & Structured Analysis
                </h1>
                <p className="text-gray-600 mt-1">
                  Extract text from scanned PDFs and generate structured data with AI
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-lg transition-colors ${
                showSettings ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>

          {showSettings && (
            <div className="mt-6 p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Processing Settings
                </h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {ocrProvider === 'google-vision' ? 'Google Vision' :
                     ocrProvider === 'aws-textract' ? 'AWS Textract' :
                     ocrProvider === 'azure-document-intelligence' ? 'Azure' :
                     ocrProvider === 'mistral' ? 'Mistral' :
                     ocrProvider === 'ocr-space' ? 'OCR.space' :
                     'Tesseract'}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    {llmProvider === 'openai' ? 'OpenAI' :
                     llmProvider === 'anthropic' ? 'Anthropic' :
                     'Mistral Large'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  OCR Provider
                </label>
                <select
                  value={ocrProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as any;
                    setOcrProvider(newProvider);

                    if (newProvider === 'ocr-space' && selectedFile) {
                      const fileSizeKB = selectedFile.size / 1024;
                      if (fileSizeKB > 1024) {
                        alert(`Warning: Your selected file is ${Math.round(fileSizeKB)} KB, which exceeds OCR.space's 1MB limit.\n\nPlease choose a different provider or upload a smaller file.`);
                      }
                    }

                  }}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white font-medium"
                >
                  <option value="google-vision">Google Vision API - High accuracy, multi-language (Recommended)</option>
                  <option value="aws-textract">AWS Textract - Advanced table detection</option>
                  <option value="azure-document-intelligence">Azure Document Intelligence - Layout analysis</option>
                  <option value="mistral">Mistral OCR (Pixtral) - AI-powered vision model</option>
                  <option value="ocr-space">OCR.space - Free tier (1MB limit)</option>
                  <option value="tesseract">Tesseract.js - Privacy-focused, local processing</option>
                </select>
                  {ocrProvider === 'ocr-space' ? (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-900">
                        <strong>Important:</strong> OCR.space free tier has a 1MB (1024 KB) file size limit. For larger files, use Google Vision, AWS Textract, or Azure Document Intelligence.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-900">
                        <strong>Tip:</strong> Each OCR provider has different capabilities and pricing. Google Vision offers the best accuracy, while OCR.space provides a free tier with limitations.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    LLM Provider
                  </label>
                  <select
                    value={llmProvider}
                    onChange={(e) => setLlmProvider(e.target.value as any)}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white font-medium"
                  >
                    <option value="openai">OpenAI (GPT-4o-mini) - Fast and efficient</option>
                    <option value="anthropic">Anthropic (Claude 3.5 Sonnet) - Advanced reasoning</option>
                    <option value="mistral-large">Mistral Large - European AI model</option>
                  </select>
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-900">
                      <strong>Tip:</strong> LLM providers generate structured data from extracted text. OpenAI offers great speed, while Claude excels at complex reasoning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {showQuickStart && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Quick Start Guide</h3>
                  <p className="text-sm text-gray-600">Follow these 3 simple steps to process your first document</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickStart(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <h4 className="font-semibold text-gray-900">Upload Document</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Drop your PDF or image file in the upload area below. Supports PDF, PNG, JPG, and WebP formats.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <h4 className="font-semibold text-gray-900">Select Template</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Choose a pre-built template or create custom output structure for your extracted data.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <h4 className="font-semibold text-gray-900">Get Results</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Click "Process Document" and get clean, structured JSON data extracted by AI.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                <strong>Need more help?</strong> Visit the Help page from the menu for detailed guides and tutorials.
              </p>
              <button
                onClick={() => setShowQuickStart(false)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Got it, dismiss
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Demo Mode</p>
            <p>
              This application works in demo mode without API keys configured. Real OCR and AI processing
              require API keys for Google Vision, Mistral, or OpenAI services. Contact your administrator
              to enable full functionality.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
                1
              </span>
              Upload PDF Document
            </h2>
            <DocumentUploader onFileSelect={handleFileSelect} isProcessing={isProcessing} />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
                2
              </span>
              Select Output Structure
            </h2>
            <TemplateEditor
              onTemplateSelect={setSelectedTemplate}
              selectedTemplate={selectedTemplate}
            />
          </div>
        </div>

        {showTesseractProcessor && selectedFile && (
          <div className="mb-8">
            <TesseractProcessor
              file={selectedFile}
              onComplete={handleTesseractComplete}
              onError={handleTesseractError}
            />
          </div>
        )}

        {tesseractText && ocrProvider === 'tesseract' && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Tesseract OCR Complete:</strong> Extracted {tesseractText.length} characters with {tesseractMetadata?.confidence.toFixed(1)}% confidence from {tesseractMetadata?.pages} page(s). Click "Process Document" to generate structured output.
            </p>
          </div>
        )}

        <div className="flex justify-center mb-8">
          <button
            onClick={handleProcessDocument}
            disabled={!canProcess || isProcessing}
            className={`
              px-8 py-4 rounded-lg font-semibold text-lg shadow-lg transition-all
              ${
                canProcess && !isProcessing
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isProcessing ? 'Processing...' : 'Process Document'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
              3
            </span>
            Results
          </h2>
          <ResultsDisplay
            status={status === 'idle' ? 'pending' : status === 'uploading' ? 'ocr_processing' : status}
            extractedText={extractedText}
            structuredOutput={structuredOutput}
            error={error}
            processingTime={processingTime}
          />

          {extractedText && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <GitBranch className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Process with DocETL Pipeline
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Take your extracted text to the next level with DocETL pipelines. Apply AI-powered transformations,
                      extract structured data, filter and aggregate information across multiple documents.
                    </p>
                    <Link
                      to="/doc-etl"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-semibold"
                    >
                      <GitBranch className="w-4 h-4" />
                      Go to DocETL Pipelines
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>
            Powered by Supabase Edge Functions, OCR APIs, and AI Language Models
          </p>
        </footer>
      </div>
    </div>
  );
}
