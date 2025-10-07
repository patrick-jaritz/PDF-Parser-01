import { useState, useRef } from 'react';
import { Upload, Camera, FileText, X, Loader2, CheckCircle } from 'lucide-react';

interface MobileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  className?: string;
}

export function MobileUploader({ onFileSelect, isProcessing, className = '' }: MobileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'camera' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isValidFile = (file: File) => {
    return file.type === 'application/pdf' || file.type.startsWith('image/');
  };

  const handleFileSelect = (file: File) => {
    if (isValidFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
      setUploadMethod(null);
    } else {
      alert('Please select a PDF or image file (PNG, JPG, WebP)');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(isValidFile);

    if (validFile) {
      handleFileSelect(validFile);
    } else {
      alert('Please upload a PDF or image file (PNG, JPG, WebP)');
    }
  };

  // Check if device supports camera
  const supportsCamera = () => {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  };

  if (selectedFile) {
    return (
      <div className={`bg-green-50 border-2 border-green-500 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          {!isProcessing && (
            <button
              onClick={handleRemoveFile}
              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {isProcessing && (
          <div className="mt-3 text-sm text-gray-600">
            Processing your document...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Upload method selection */}
      {!uploadMethod ? (
        <div className="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center
              transition-all duration-200
              ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 bg-white'
              }
              ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>

              <div>
                <p className="text-base font-medium text-gray-700 mb-1">
                  Upload your document
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports PDFs and images (PNG, JPG, WebP)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm">
                <button
                  onClick={() => setUploadMethod('file')}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Choose File
                </button>

                {supportsCamera() && (
                  <button
                    onClick={() => setUploadMethod('camera')}
                    className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-400">
                Maximum file size: 10MB
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File selection */}
          {uploadMethod === 'file' && (
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileInput}
                className="hidden"
                disabled={isProcessing}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-5 h-5" />
                Select File from Device
              </button>
            </div>
          )}

          {/* Camera capture */}
          {uploadMethod === 'camera' && (
            <div className="text-center">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
                disabled={isProcessing}
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-5 h-5" />
                Take Photo with Camera
              </button>
            </div>
          )}

          {/* Back button */}
          <button
            onClick={() => setUploadMethod(null)}
            className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Back to Options
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={isProcessing}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
        disabled={isProcessing}
      />
    </div>
  );
}

