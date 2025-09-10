import { llmConfigManager } from './llmConfig';

export interface CloudinaryFile {
  publicId: string;
  secureUrl: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  width?: number;
  height?: number;
}

export class CloudinaryStorageService {
  private config: { cloudName: string; uploadPreset: string };

  constructor() {
    this.config = llmConfigManager.getCloudinaryConfig();
  }

  private updateConfig(): void {
    this.config = llmConfigManager.getCloudinaryConfig();
  }

  isConfigured(): boolean {
    return llmConfigManager.isCloudinaryConfigured();
  }

  async uploadFile(file: File): Promise<CloudinaryFile> {
    this.updateConfig();
    
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not configured. Please configure your Cloudinary settings in admin settings.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.config.uploadPreset);
    formData.append('cloud_name', this.config.cloudName);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      
      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        name: file.name,
        size: result.bytes,
        mimeType: result.format,
        uploadedAt: result.created_at,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getFileUrl(publicId: string, transformations?: string): string {
    const baseUrl = `https://res.cloudinary.com/${this.config.cloudName}/image/upload`;
    return transformations ? `${baseUrl}/${transformations}/${publicId}` : `${baseUrl}/${publicId}`;
  }

  // Generate optimized image URL with transformations
  getOptimizedImageUrl(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}): string {
    const { width, height, quality = 'auto', format = 'auto' } = options;
    
    let transformations = '';
    if (width) transformations += `w_${width},`;
    if (height) transformations += `h_${height},`;
    if (quality) transformations += `q_${quality},`;
    if (format) transformations += `f_${format},`;
    
    // Remove trailing comma
    transformations = transformations.replace(/,$/, '');
    
    return this.getFileUrl(publicId, transformations);
  }
}

export const cloudinaryStorage = new CloudinaryStorageService();
