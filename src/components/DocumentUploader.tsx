import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';

interface DocumentUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export function DocumentUploader({ onFileSelect, isProcessing }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const isValidFile = (file: File) => {
    return file.type === 'application/pdf' || file.type.startsWith('image/');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(isValidFile);

    if (validFile) {
      setSelectedFile(validFile);
      onFileSelect(validFile);
    } else {
      alert('Please upload a PDF or image file (PNG, JPG, WebP)');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      alert('Please select a PDF or image file (PNG, JPG, WebP)');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }
            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={isProcessing}
          />

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-700 mb-1">
                Drop your document or image here, or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports PDFs and images (PNG, JPG, WebP) for OCR text extraction
              </p>
            </div>

            <div className="text-xs text-gray-400">
              Maximum file size: 10MB
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                ) : (
                  <FileText className="w-6 h-6 text-green-600" />
                )}
              </div>

              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
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
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>

          {isProcessing && (
            <div className="mt-4 text-sm text-gray-600">
              Processing your document...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
