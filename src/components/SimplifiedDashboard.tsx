import { useState, useEffect } from 'react';
import { FileText, Upload, Settings, BookOpen, Zap, TrendingUp, Clock, CheckCircle, AlertCircle, X, Plus, Eye, Download, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DocumentUploader } from './DocumentUploader';
import { MobileUploader } from './MobileUploader';
import { TemplateEditor } from './TemplateEditor';
import { ResultsDisplay } from './ResultsDisplay';
import { TesseractProcessor } from './TesseractProcessor';
import { useDocumentProcessor } from '../hooks/useDocumentProcessor';
import { supabase } from '../lib/supabase';

interface RecentDocument {
  id: string;
  filename: string;
  status: 'completed' | 'processing' | 'failed';
  created_at: string;
  extracted_text?: string;
  structured_output?: any;
  processing_time_ms?: number;
}

interface UserStats {
  totalDocuments: number;
  completedToday: number;
  averageProcessingTime: number;
  successRate: number;
}

export function SimplifiedDashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalDocuments: 0,
    completedToday: 0,
    averageProcessingTime: 0,
    successRate: 0
  });
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [userType, setUserType] = useState<'novice' | 'intermediate' | 'expert'>('novice');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [ocrProvider, setOcrProvider] = useState<'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space' | 'openai-vision'>('google-vision');
  const [llmProvider, setLlmProvider] = useState<'openai' | 'anthropic' | 'mistral-large'>('openai');
  const [openaiVisionModel, setOpenaiVisionModel] = useState<'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo'>('gpt-4o-mini');
  const [openaiLlmModel, setOpenaiLlmModel] = useState<'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-4'>('gpt-4o-mini');
  const [anthropicModel, setAnthropicModel] = useState<'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022' | 'claude-3-opus-20240229'>('claude-3-5-sonnet-20241022');
  const [mistralModel, setMistralModel] = useState<'mistral-large-latest' | 'mistral-medium-latest' | 'mistral-small-latest'>('mistral-large-latest');
  const [tesseractText, setTesseractText] = useState<string | null>(null);
  const [tesseractMetadata, setTesseractMetadata] = useState<{ confidence: number; pages: number } | null>(null);
  const [showTesseractProcessor, setShowTesseractProcessor] = useState(false);

  const {
    status,
    extractedText,
    structuredOutput,
    error,
    processingTime,
    processDocument,
    processWithExtractedText,
    reset,
    setState,
  } = useDocumentProcessor();

  // Load user data and determine user type
  useEffect(() => {
    loadUserData();
    determineUserType();
    detectMobile();
  }, []);

  const detectMobile = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword));
    const isSmallScreen = window.innerWidth < 768;
    setIsMobile(isMobileDevice || isSmallScreen);
  };

  const loadUserData = async () => {
    try {
      // Load recent documents with their processing jobs
      const { data: documents } = await supabase
        .from('documents')
        .select(`
          id,
          filename,
          status,
          created_at,
          processing_jobs (
            id,
            extracted_text,
            structured_output,
            processing_time_ms,
            status
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (documents) {
        setRecentDocuments(documents.map(doc => {
          // Get the most recent processing job
          const jobs = Array.isArray(doc.processing_jobs) ? doc.processing_jobs : [];
          const latestJob = jobs.length > 0 ? jobs[0] : null;
          
          return {
            id: doc.id,
            filename: doc.filename,
            status: doc.status,
            created_at: doc.created_at,
            extracted_text: latestJob?.extracted_text,
            structured_output: latestJob?.structured_output,
            processing_time_ms: latestJob?.processing_time_ms
          };
        }));
      }

      // Load user stats
      const { data: allDocs } = await supabase
        .from('documents')
        .select('status, created_at, processing_time_ms');

      if (allDocs) {
        const total = allDocs.length;
        const completed = allDocs.filter(d => d.status === 'completed').length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = allDocs.filter(d => 
          d.status === 'completed' && new Date(d.created_at) >= today
        ).length;
        
        const completedWithTime = allDocs.filter(d => 
          d.status === 'completed' && d.processing_time_ms
        );
        const avgTime = completedWithTime.length > 0
          ? completedWithTime.reduce((sum, d) => sum + (d.processing_time_ms || 0), 0) / completedWithTime.length
          : 0;

        setUserStats({
          totalDocuments: total,
          completedToday,
          averageProcessingTime: Math.round(avgTime),
          successRate: total > 0 ? Math.round((completed / total) * 100) : 0
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const determineUserType = () => {
    // Simple heuristic based on document count and complexity
    if (userStats.totalDocuments === 0) {
      setUserType('novice');
    } else if (userStats.totalDocuments < 10) {
      setUserType('intermediate');
    } else {
      setUserType('expert');
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setTesseractText(null);
    setTesseractMetadata(null);
    setShowTesseractProcessor(false);
    // Keep upload area open to show template selection
    reset();
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
    
    console.log("Processing document with:", { ocrProvider, hasTemplate: !!selectedTemplate, hasFile: !!selectedFile, tesseractText: tesseractText?.substring(0, 50) });
    
    // Get the selected LLM model based on provider
    const llmModel = llmProvider === 'openai' ? openaiLlmModel :
                     llmProvider === 'anthropic' ? anthropicModel :
                     mistralModel;

    if (ocrProvider === 'tesseract') {
      if (tesseractText) {
        await processWithExtractedText(selectedFile, tesseractText, tesseractMetadata!, selectedTemplate, llmProvider, llmModel);
      } else {
        setShowTesseractProcessor(true);
      }
    } else {
      await processDocument(selectedFile, selectedTemplate, ocrProvider, llmProvider, openaiVisionModel, llmModel);
    }
  };

  const handleViewDocument = async (documentId: string) => {
    try {
      // Fetch the document's processing job to get results
      const { data: jobs } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (jobs && jobs.length > 0) {
        const job = jobs[0];
        setState({
          status: job.status as any,
          documentId: documentId,
          jobId: job.id,
          extractedText: job.extracted_text,
          structuredOutput: job.structured_output,
          processingTime: job.processing_time_ms,
        });
        // Scroll to results
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  const handleExportDocument = async (documentId: string) => {
    try {
      const { data: jobs } = await supabase
        .from('processing_jobs')
        .select('structured_output')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (jobs && jobs.length > 0 && jobs[0].structured_output) {
        const json = JSON.stringify(jobs[0].structured_output, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${documentId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting document:', error);
    }
  };

  const handleRetryDocument = async (documentId: string, filename: string) => {
    try {
      // Fetch the original document
      const { data: doc } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (doc?.file_url) {
        // Download the file and re-process it
        const response = await fetch(doc.file_url);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type });
        
        setSelectedFile(file);
        setShowUploadArea(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error retrying document:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canProcess = selectedFile && selectedTemplate && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'ocr_processing' || status === 'llm_processing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  DocProcessor
                </h1>
                <p className="text-gray-600 mt-1">
                  Transform documents into structured data with AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className={`p-3 rounded-lg transition-colors ${
                  showAdvancedSettings ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Advanced Settings"
              >
                <Settings className="w-6 h-6" />
              </button>
              <Link
                to="/help"
                className="p-3 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                title="Help & Support"
              >
                <BookOpen className="w-6 h-6" />
              </Link>
            </div>
          </div>

          {/* Advanced Settings Panel */}
          {showAdvancedSettings && (
            <div className="mt-6 p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Processing Settings
                </h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {ocrProvider === 'google-vision' ? 'Google Vision' :
                     ocrProvider === 'openai-vision' ? 'OpenAI Vision' :
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
                    <option value="openai-vision">OpenAI Vision (GPT-4o-mini) - AI-powered image understanding</option>
                    <option value="aws-textract">AWS Textract - Advanced table detection</option>
                    <option value="azure-document-intelligence">Azure Document Intelligence - Layout analysis</option>
                    <option value="mistral">Mistral OCR (Pixtral) - AI-powered vision model</option>
                    <option value="ocr-space">OCR.space - Free tier (1MB limit)</option>
                    <option value="tesseract">Tesseract.js - Privacy-focused, local processing</option>
                  </select>
                  {ocrProvider === 'tesseract' ? (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-900">
                        <strong>Privacy First:</strong> Tesseract.js processes documents entirely in your browser. No data is sent to any server during OCR, ensuring complete privacy. Processing may be slower than cloud services.
                      </p>
                    </div>
                  ) : ocrProvider === 'ocr-space' ? (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-900">
                        <strong>Important:</strong> OCR.space free tier has a 1MB (1024 KB) file size limit. For larger files, use Google Vision, AWS Textract, or Azure Document Intelligence.
                      </p>
                    </div>
                  ) : ocrProvider === 'openai-vision' ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GPT Model
                        </label>
                        <select
                          value={openaiVisionModel}
                          onChange={(e) => setOpenaiVisionModel(e.target.value as any)}
                          disabled={isProcessing}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                          <option value="gpt-4o-mini">GPT-4o Mini - Fastest, most affordable (~$0.00015/page)</option>
                          <option value="gpt-4o">GPT-4o - Best quality, more accurate (~$0.0025/page)</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo - Previous generation</option>
                        </select>
                      </div>
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs text-purple-900">
                          <strong>Note:</strong> OpenAI Vision uses GPT models for OCR. GPT-4o-mini offers great speed and cost efficiency, while GPT-4o provides higher accuracy for complex documents.
                        </p>
                      </div>
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
                    <option value="openai">OpenAI - Fast and efficient</option>
                    <option value="anthropic">Anthropic (Claude) - Advanced reasoning</option>
                    <option value="mistral-large">Mistral - European AI model</option>
                  </select>

                  {/* Model selectors for each LLM provider */}
                  {llmProvider === 'openai' && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          OpenAI Model
                        </label>
                        <select
                          value={openaiLlmModel}
                          onChange={(e) => setOpenaiLlmModel(e.target.value as any)}
                          disabled={isProcessing}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                          <option value="gpt-4o-mini">GPT-4o Mini - Fastest, most affordable</option>
                          <option value="gpt-4o">GPT-4o - Best balance of speed and quality</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo - Previous generation</option>
                          <option value="gpt-4">GPT-4 - Highest quality</option>
                        </select>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-900">
                          <strong>GPT-4o-mini</strong> is recommended for most use cases - it's fast, affordable, and highly accurate.
                        </p>
                      </div>
                    </div>
                  )}

                  {llmProvider === 'anthropic' && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Anthropic Model
                        </label>
                        <select
                          value={anthropicModel}
                          onChange={(e) => setAnthropicModel(e.target.value as any)}
                          disabled={isProcessing}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                          <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet - Best overall (Recommended)</option>
                          <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku - Fast and affordable</option>
                          <option value="claude-3-opus-20240229">Claude 3 Opus - Highest intelligence</option>
                        </select>
                      </div>
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs text-purple-900">
                          <strong>Claude 3.5 Sonnet</strong> offers the best balance of intelligence, speed, and cost.
                        </p>
                      </div>
                    </div>
                  )}

                  {llmProvider === 'mistral-large' && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mistral Model
                        </label>
                        <select
                          value={mistralModel}
                          onChange={(e) => setMistralModel(e.target.value as any)}
                          disabled={isProcessing}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                          <option value="mistral-large-latest">Mistral Large - Highest performance</option>
                          <option value="mistral-medium-latest">Mistral Medium - Balanced</option>
                          <option value="mistral-small-latest">Mistral Small - Fast and efficient</option>
                        </select>
                      </div>
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <p className="text-xs text-indigo-900">
                          <strong>Mistral Large</strong> is recommended for complex structured output generation.
                        </p>
                      </div>
                    </div>
                  )}

                  {!llmProvider.includes('openai') && !llmProvider.includes('anthropic') && !llmProvider.includes('mistral') && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-900">
                        <strong>Tip:</strong> LLM providers generate structured data from extracted text.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Onboarding for new users */}
        {showOnboarding && userStats.totalDocuments === 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Welcome to DocProcessor!</h3>
                  <p className="text-sm text-gray-600">Let's get you started with your first document</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <h4 className="font-semibold text-gray-900">Upload Document</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Drop your PDF or image file. We support PDF, PNG, JPG, and WebP formats.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <h4 className="font-semibold text-gray-900">AI Processing</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Our AI extracts text and structures it according to your needs.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <h4 className="font-semibold text-gray-900">Get Results</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Download structured JSON or CSV data ready for your applications.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-blue-200">
              <p className="text-xs text-gray-600">
                <strong>Ready to start?</strong> Click the upload button below to process your first document.
              </p>
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Got it, let's go!
              </button>
            </div>
          </div>
        )}

        {/* User Stats */}
        {userStats.totalDocuments > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.totalDocuments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.completedToday}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Processing</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userStats.averageProcessingTime > 0 
                      ? `${Math.round(userStats.averageProcessingTime / 1000)}s`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.successRate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Upload Area */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="w-6 h-6 text-blue-600" />
              Process New Document
            </h2>
            {!showUploadArea && (
              <button
                onClick={() => setShowUploadArea(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Upload Document
              </button>
            )}
          </div>

          {showUploadArea && (
            <div className="space-y-6">
              {isMobile ? (
                <MobileUploader onFileSelect={handleFileSelect} isProcessing={isProcessing} />
              ) : (
                <DocumentUploader onFileSelect={handleFileSelect} isProcessing={isProcessing} />
              )}
              
              {showTesseractProcessor && selectedFile && (
                <TesseractProcessor
                  file={selectedFile}
                  onComplete={handleTesseractComplete}
                  onError={handleTesseractError}
                />
              )}

              {tesseractText && ocrProvider === 'tesseract' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Tesseract OCR Complete:</strong> Extracted {tesseractText.length} characters with {tesseractMetadata?.confidence.toFixed(1)}% confidence from {tesseractMetadata?.pages} page(s). Click "Process Document" to generate structured output.
                  </p>
                </div>
              )}
              
              {selectedFile && !showTesseractProcessor && (
                <TemplateEditor
                  onTemplateSelect={setSelectedTemplate}
                  selectedTemplate={selectedTemplate}
                />
              )}

              {canProcess && !showTesseractProcessor && (
                <div className="flex justify-center">
                  <button
                    onClick={handleProcessDocument}
                    disabled={isProcessing}
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
              )}
            </div>
          )}
        </div>

        {/* Results Display */}
        {(status !== 'idle' || extractedText || structuredOutput || error) && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Processing Results
            </h2>
            <ResultsDisplay
              status={status === 'idle' ? 'pending' : status === 'uploading' ? 'ocr_processing' : status}
              extractedText={extractedText}
              structuredOutput={structuredOutput}
              error={error}
              processingTime={processingTime}
            />
          </div>
        )}

        {/* Recent Documents */}
        {recentDocuments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-gray-600" />
                Recent Documents
              </h2>
              <Link
                to="/documents"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-medium text-gray-900 mb-2 truncate" title={doc.filename}>
                    {doc.filename}
                  </h3>

                  {doc.processing_time_ms && (
                    <p className="text-xs text-gray-500 mb-3">
                      Processed in {Math.round(doc.processing_time_ms / 1000)}s
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleViewDocument(doc.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    {doc.status === 'completed' && (
                      <button 
                        onClick={() => handleExportDocument(doc.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                    )}
                    {doc.status === 'failed' && (
                      <button 
                        onClick={() => handleRetryDocument(doc.id, doc.filename)}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/doc-etl"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">DocETL Pipelines</h3>
            </div>
            <p className="text-sm text-gray-600">
              Create advanced document processing workflows with AI-powered transformations.
            </p>
          </Link>

          <Link
            to="/analytics"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Analytics</h3>
            </div>
            <p className="text-sm text-gray-600">
              View detailed insights about your document processing performance and usage.
            </p>
          </Link>

          <Link
            to="/templates"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Template Library</h3>
            </div>
            <p className="text-sm text-gray-600">
              Browse and customize templates for different document types and use cases.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
