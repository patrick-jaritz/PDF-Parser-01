import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, FileText, GitBranch, Upload, Wand2, Download, CheckCircle } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
  icon: React.ReactNode;
}

export function UserGuide() {
  const [openSection, setOpenSection] = useState<string>('getting-started');

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? '' : id);
  };

  const sections: Section[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Welcome to DocProcessor! This application helps you extract text from scanned PDFs and images,
            then transform them into structured data using AI.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What You Can Do:</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Extract text from scanned PDFs and images using advanced OCR technology</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Convert unstructured text into structured JSON data with custom templates</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Create powerful document processing pipelines with DocETL</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Process multiple documents with consistent results</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'basic-workflow',
      title: 'Basic Document Processing (3 Simple Steps)',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Your Document
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Click the upload area or drag and drop your PDF or image file. Supported formats include PDF, PNG, JPG, and WebP.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <strong>Tip:</strong> For best results, ensure your document has clear, readable text. Higher resolution images produce better OCR results.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Choose Your Output Structure
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Select a template that defines how you want your data structured. You can choose from pre-built templates or create custom ones.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <strong>Available Templates:</strong>
                <ul className="mt-2 space-y-1 ml-4">
                  <li>• Invoice Data - Extract invoice numbers, dates, amounts, vendors</li>
                  <li>• Resume Parser - Extract candidate information, skills, experience</li>
                  <li>• Contract Analysis - Extract key terms, parties, dates</li>
                  <li>• Receipt Scanner - Extract merchant, items, totals</li>
                  <li>• Exam Questions - Extract questions, answers, topics, difficulty</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Get Your Structured Data
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Click "Process Document" and wait for the AI to extract and structure your data. You'll receive clean, structured JSON output ready to use.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-xs text-green-800">
                <strong>What Happens Behind the Scenes:</strong>
                <ol className="mt-2 space-y-1 ml-4">
                  <li>1. Your document is uploaded securely to cloud storage</li>
                  <li>2. OCR technology extracts all text from the document</li>
                  <li>3. AI analyzes the text and structures it according to your template</li>
                  <li>4. Clean, formatted JSON data is returned to you</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'docetl-pipelines',
      title: 'DocETL Pipelines (Advanced)',
      icon: <GitBranch className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            DocETL Pipelines allow you to create sophisticated document processing workflows using multiple operators.
            This is perfect for batch processing or complex transformations.
          </p>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">What is a Pipeline?</h4>
            <p className="text-sm text-gray-700 mb-3">
              A pipeline is a series of operations (called "operators") that transform your documents step by step.
              Think of it like an assembly line for document processing.
            </p>
            <div className="text-sm text-gray-700">
              <strong>Example Pipeline Flow:</strong>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="px-3 py-1 bg-white rounded-lg border border-blue-300">Upload Document</span>
                <span>→</span>
                <span className="px-3 py-1 bg-white rounded-lg border border-blue-300">Extract Info</span>
                <span>→</span>
                <span className="px-3 py-1 bg-white rounded-lg border border-blue-300">Filter Results</span>
                <span>→</span>
                <span className="px-3 py-1 bg-white rounded-lg border border-blue-300">Final Output</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Available Operators:</h4>

            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 text-sm mb-1">Map - Transform Each Document</h5>
              <p className="text-xs text-gray-600">
                Extract specific information from every document. Perfect for standardizing data extraction.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 text-sm mb-1">Filter - Select Documents</h5>
              <p className="text-xs text-gray-600">
                Keep only documents that meet certain criteria. Remove irrelevant documents from your results.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 text-sm mb-1">Reduce - Group & Summarize</h5>
              <p className="text-xs text-gray-600">
                Combine related documents and create summaries. Great for aggregating information by category.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 text-sm mb-1">Resolve - Deduplicate</h5>
              <p className="text-xs text-gray-600">
                Identify and merge duplicate documents. Ensures you don't have redundant data.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Getting Started with Pipelines:</h4>
            <ol className="text-sm text-yellow-800 space-y-1 ml-4">
              <li>1. Navigate to the "DocETL" page from the main menu</li>
              <li>2. Click "New Pipeline" or use an example pipeline</li>
              <li>3. Configure your operators in sequence</li>
              <li>4. Test with sample documents</li>
              <li>5. Run on your full document set</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'ocr-providers',
      title: 'OCR Providers Explained',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            OCR (Optical Character Recognition) is the technology that extracts text from images and scanned documents.
            Different providers have different strengths:
          </p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="font-semibold text-gray-900 mb-2">Google Vision API</h5>
              <p className="text-sm text-gray-700 mb-2">Best overall accuracy and multi-language support.</p>
              <div className="text-xs text-gray-600">
                <strong>Best for:</strong> Complex documents, multiple languages, high accuracy requirements
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="font-semibold text-gray-900 mb-2">AWS Textract</h5>
              <p className="text-sm text-gray-700 mb-2">Advanced table detection and form extraction.</p>
              <div className="text-xs text-gray-600">
                <strong>Best for:</strong> Forms, tables, invoices with structured layouts
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="font-semibold text-gray-900 mb-2">Azure Document Intelligence</h5>
              <p className="text-sm text-gray-700 mb-2">Excellent layout analysis and document understanding.</p>
              <div className="text-xs text-gray-600">
                <strong>Best for:</strong> Document layout preservation, receipts, ID cards
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="font-semibold text-gray-900 mb-2">OCR.space</h5>
              <p className="text-sm text-gray-700 mb-2">Free tier available with 1MB file size limit.</p>
              <div className="text-xs text-gray-600">
                <strong>Best for:</strong> Testing, small documents, budget-conscious projects
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="font-semibold text-gray-900 mb-2">Tesseract.js</h5>
              <p className="text-sm text-gray-700 mb-2">Open source, runs locally in your browser.</p>
              <div className="text-xs text-gray-600">
                <strong>Best for:</strong> Privacy-sensitive documents, offline processing, no API costs
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tips-best-practices',
      title: 'Tips & Best Practices',
      icon: <Wand2 className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Document Quality Tips
            </h4>
            <ul className="space-y-2 text-sm text-green-800">
              <li>• Use high-resolution scans (300 DPI or higher) for best OCR results</li>
              <li>• Ensure documents are well-lit and have good contrast</li>
              <li>• Avoid skewed or rotated images - straighten them first</li>
              <li>• Remove shadows and glare from photos</li>
              <li>• Use PDF format when possible for multi-page documents</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">Template Selection Tips</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Start with a pre-built template that's closest to your needs</li>
              <li>• Test with a sample document before processing large batches</li>
              <li>• Customize templates to match your specific data fields</li>
              <li>• Use descriptive field names for easier data handling later</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-3">Performance Tips</h4>
            <ul className="space-y-2 text-sm text-purple-800">
              <li>• Compress large PDF files before uploading (keep under 10MB)</li>
              <li>• Process documents during off-peak hours for faster results</li>
              <li>• Use appropriate OCR provider based on document complexity</li>
              <li>• Consider Tesseract.js for simple documents to save on API costs</li>
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-3">Common Mistakes to Avoid</h4>
            <ul className="space-y-2 text-sm text-orange-800">
              <li>• Don't upload documents exceeding the file size limit</li>
              <li>• Avoid processing handwritten documents without appropriate OCR</li>
              <li>• Don't expect perfect results with very low-quality scans</li>
              <li>• Remember to review extracted data for accuracy</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Guide</h2>
            <p className="text-sm text-gray-600">Everything you need to know to get started</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {sections.map((section) => (
          <div key={section.id} className="transition-colors hover:bg-gray-50">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="text-blue-600">{section.icon}</div>
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
              </div>
              {openSection === section.id ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {openSection === section.id && (
              <div className="px-6 pb-6 pt-2">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
