import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cloudinaryStorage, CloudinaryFile } from '@/lib/cloudinaryStorage';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

interface CloudinaryFileUploaderProps {
  onFileUploaded: (file: CloudinaryFile) => void;
  onFileRemoved?: (file: CloudinaryFile) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  className?: string;
}

export function CloudinaryFileUploader({
  onFileUploaded,
  onFileRemoved,
  acceptedTypes = 'image/*',
  maxSize = 10,
  multiple = false,
  className = '',
}: CloudinaryFileUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<CloudinaryFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCloudinaryConfigured = cloudinaryStorage.isConfigured();

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    if (acceptedTypes && !file.type.match(acceptedTypes.replace('*', '.*'))) {
      return `File type not supported. Accepted types: ${acceptedTypes}`;
    }

    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      if (multiple) {
        // Handle multiple files
        const uploadPromises = Array.from(files).map(async (file) => {
          const validationError = validateFile(file);
          if (validationError) {
            throw new Error(`File "${file.name}": ${validationError}`);
          }
          return await cloudinaryStorage.uploadFile(file);
        });

        const uploadedFiles = await Promise.all(uploadPromises);
        
        // For multiple files, we'll call onFileUploaded for each file
        // The parent component should handle accumulating them
        uploadedFiles.forEach(file => onFileUploaded(file));
        
        // Set the first uploaded file for display purposes
        if (uploadedFiles.length > 0) {
          setUploadedFile(uploadedFiles[0]);
        }
      } else {
        // Handle single file
        const file = files[0];
        const validationError = validateFile(file);
        
        if (validationError) {
          setError(validationError);
          return;
        }

        const uploadedFile = await cloudinaryStorage.uploadFile(file);
        setUploadedFile(uploadedFile);
        onFileUploaded(uploadedFile);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    if (uploadedFile) {
      onFileRemoved?.(uploadedFile);
    }
    setUploadedFile(null);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (!isCloudinaryConfigured) {
      setError('File storage is not configured. Please configure Cloudinary in admin settings.');
      return;
    }
    fileInputRef.current?.click();
  };

  if (!isCloudinaryConfigured) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Cloudinary is not configured. Please set Cloud Name and Upload Preset in LLM Settings.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!uploadedFile ? (
        <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="p-6">
            <div className="text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload Image
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {multiple 
                  ? 'Click to select multiple image files or drag and drop'
                  : 'Click to select an image file or drag and drop'
                }
              </p>
              <Button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {multiple ? 'Uploading Files...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {multiple ? 'Choose Files' : 'Choose File'}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                Max size: {maxSize}MB • Accepted: {acceptedTypes}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <img
                  src={cloudinaryStorage.getOptimizedImageUrl(uploadedFile.publicId, { width: 60, height: 60, quality: 'auto' })}
                  alt={uploadedFile.name}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">Uploaded successfully</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <p className="font-medium mb-1">💡 How to use AI image recognition:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Go to the "Simulations" tab to upload question images</li>
          <li>Use the "Upload Form" to process multiple question images</li>
          <li>Use "Answer Sheet Upload" to extract answer keys</li>
          <li>In the Question Builder, upload an image and click "Extract & Overwrite from Image"</li>
        </ul>
      </div>
    </div>
  );
}
