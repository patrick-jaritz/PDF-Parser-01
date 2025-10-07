import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, FileText, Zap, Database, Download } from 'lucide-react';

interface ProcessingStage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration?: number;
  error?: string;
}

interface ProcessingProgressProps {
  status: 'uploading' | 'ocr_processing' | 'llm_processing' | 'completed' | 'failed';
  processingTime?: number;
  error?: string;
  fileName?: string;
  onCancel?: () => void;
}

export function ProcessingProgress({ 
  status, 
  processingTime, 
  error, 
  fileName,
  onCancel 
}: ProcessingProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Define processing stages
  const stages: ProcessingStage[] = [
    {
      id: 'upload',
      name: 'Uploading Document',
      description: 'Preparing your file for processing',
      icon: <FileText className="w-5 h-5" />,
      status: status === 'uploading' ? 'processing' : 'completed'
    },
    {
      id: 'ocr',
      name: 'Extracting Text',
      description: 'Using AI to read and extract text from your document',
      icon: <Zap className="w-5 h-5" />,
      status: status === 'ocr_processing' ? 'processing' : 
              status === 'uploading' ? 'pending' : 'completed'
    },
    {
      id: 'llm',
      name: 'Structuring Data',
      description: 'Organizing extracted text into structured format',
      icon: <Database className="w-5 h-5" />,
      status: status === 'llm_processing' ? 'processing' : 
              ['uploading', 'ocr_processing'].includes(status) ? 'pending' : 'completed'
    },
    {
      id: 'complete',
      name: 'Processing Complete',
      description: 'Your structured data is ready',
      icon: <Download className="w-5 h-5" />,
      status: status === 'completed' ? 'completed' : 
              status === 'failed' ? 'failed' : 'pending'
    }
  ];

  // Update current stage based on status
  useEffect(() => {
    switch (status) {
      case 'uploading':
        setCurrentStage(0);
        break;
      case 'ocr_processing':
        setCurrentStage(1);
        break;
      case 'llm_processing':
        setCurrentStage(2);
        break;
      case 'completed':
        setCurrentStage(3);
        break;
      case 'failed':
        setCurrentStage(Math.max(0, currentStage));
        break;
    }
  }, [status, currentStage]);

  const getStageIcon = (stage: ProcessingStage, index: number) => {
    if (stage.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (stage.status === 'failed') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (stage.status === 'processing') {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    if (index <= currentStage) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getStageColor = (stage: ProcessingStage, index: number) => {
    if (stage.status === 'completed' || (index < currentStage)) {
      return 'bg-green-500';
    }
    if (stage.status === 'failed') {
      return 'bg-red-500';
    }
    if (stage.status === 'processing' || index === currentStage) {
      return 'bg-blue-500';
    }
    return 'bg-gray-300';
  };

  const getProgressPercentage = () => {
    if (status === 'completed') return 100;
    if (status === 'failed') return Math.max(0, (currentStage / stages.length) * 100);
    return ((currentStage + 0.5) / stages.length) * 100;
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getEstimatedTimeRemaining = () => {
    if (status === 'completed' || status === 'failed') return 0;
    
    const avgTimePerStage = 15000; // 15 seconds average per stage
    const remainingStages = stages.length - currentStage - 1;
    return Math.max(0, remainingStages * avgTimePerStage - (elapsedTime % avgTimePerStage));
  };

  if (status === 'completed') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              Processing Complete!
            </h3>
            <p className="text-sm text-green-700">
              Your document has been successfully processed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-600 font-medium mb-1">Processing Time</p>
            <p className="text-lg font-bold text-green-900">
              {processingTime ? formatTime(processingTime) : formatTime(elapsedTime)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-600 font-medium mb-1">File Processed</p>
            <p className="text-sm font-semibold text-green-900 truncate" title={fileName}>
              {fileName || 'Document'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-600 font-medium mb-1">Status</p>
            <p className="text-sm font-semibold text-green-900">Success</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span>All stages completed successfully</span>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900">
              Processing Failed
            </h3>
            <p className="text-sm text-red-700">
              There was an error processing your document
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span>Processing stopped at stage {currentStage + 1}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">
              Processing Your Document
            </h3>
            <p className="text-sm text-blue-700">
              {stages[currentStage]?.description || 'Please wait...'}
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Progress: {Math.round(getProgressPercentage())}%
          </span>
          <span className="text-sm text-blue-700">
            {formatTime(elapsedTime)}
            {getEstimatedTimeRemaining() > 0 && (
              <span className="text-blue-500 ml-2">
                • ~{formatTime(getEstimatedTimeRemaining())} remaining
              </span>
            )}
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Processing stages */}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
              index === currentStage ? 'bg-blue-100 border border-blue-200' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex-shrink-0">
              {getStageIcon(stage, index)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{stage.name}</h4>
                <div className={`w-3 h-3 rounded-full ${getStageColor(stage, index)}`} />
              </div>
              <p className="text-sm text-gray-600">{stage.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* File info */}
      {fileName && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <FileText className="w-4 h-4" />
            <span>Processing: {fileName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

