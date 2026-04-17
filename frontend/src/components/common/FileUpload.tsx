import React, { useRef, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import ErrorMessage from './ErrorMessage';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
  selectedFile?: File | null;
  onClearFile?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '.pdf,.txt,.json,.docx',
  maxSize = 50 * 1024 * 1024, // 50MB
  className = '',
  selectedFile,
  onClearFile,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      setError(`File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`);
      return false;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim().replace('.', ''));
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      setError(`Invalid file type. Allowed types: ${accept}`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const clearFile = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onClearFile?.();
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <div className={`border-2 border-primary-200 bg-primary-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <File className="w-8 h-8 text-primary-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={clearFile}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="mt-2 block text-sm font-medium text-gray-900">
              Drop your file here, or{' '}
              <span className="text-primary-600 hover:text-primary-500">browse</span>
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              Supported formats: PDF, TXT, JSON, DOCX (Max {Math.round(maxSize / (1024 * 1024))}MB)
            </span>
          </label>
          <input
            ref={inputRef}
            id="file-upload"
            type="file"
            className="sr-only"
            accept={accept}
            onChange={handleChange}
          />
        </div>
        <button
          type="button"
          onClick={onButtonClick}
          className="mt-4 btn btn-secondary"
        >
          Select File
        </button>
      </div>

      {error && (
        <div className="mt-2">
          <ErrorMessage message={error} />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
