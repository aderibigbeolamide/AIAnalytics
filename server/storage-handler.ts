import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  publicId?: string; // For Cloudinary
}

/**
 * File storage handler that supports local development and Cloudinary for production
 */
export class FileStorageHandler {
  private uploadDir: string;
  private baseUrl: string;
  private useCloudinary: boolean;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.baseUrl = process.env.APP_DOMAIN || 'http://localhost:5000';
    this.useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    
    this.initializeStorage();
  }

  private async initializeStorage() {
    if (this.useCloudinary) {
      // Configure Cloudinary
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      console.log('✅ Cloudinary configured for file uploads');
    } else {
      // Ensure local upload directory exists
      await this.ensureUploadDirectory();
      console.log('📁 Local file storage configured');
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Save uploaded file and return file info
   */
  async saveFile(file: Express.Multer.File, folder?: string): Promise<UploadedFile> {
    if (this.useCloudinary) {
      return this.saveToCloudinary(file, folder);
    } else {
      return this.saveToLocal(file, folder);
    }
  }

  /**
   * Save file to Cloudinary
   */
  private async saveToCloudinary(file: Express.Multer.File, folder?: string): Promise<UploadedFile> {
    try {
      const uploadOptions: any = {
        resource_type: 'auto',
        public_id: `${nanoid()}_${Date.now()}`,
        quality: 'auto:good',
        fetch_format: 'auto',
      };

      if (folder) {
        uploadOptions.folder = `eventvalidate/${folder}`;
      } else {
        uploadOptions.folder = 'eventvalidate';
      }

      // Upload file buffer to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      }) as any;

      return {
        filename: result.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload file to Cloudinary');
    }
  }

  /**
   * Save file to local storage
   */
  private async saveToLocal(file: Express.Multer.File, folder?: string): Promise<UploadedFile> {
    await this.ensureUploadDirectory();



    // Generate unique filename - handle case where originalname might be undefined
    const fileExtension = file.originalname ? path.extname(file.originalname) : '.jpg';
    const filename = `${nanoid()}_${Date.now()}${fileExtension}`;
    
    // Create subfolder if specified
    const targetDir = folder ? path.join(this.uploadDir, folder) : this.uploadDir;
    await fs.mkdir(targetDir, { recursive: true });
    
    const filePath = path.join(targetDir, filename);
    const relativePath = folder ? `${folder}/${filename}` : filename;

    // Write file to disk
    await fs.writeFile(filePath, file.buffer);

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `${this.baseUrl}/uploads/${relativePath}`,
    };
  }

  /**
   * Delete a file by filename or publicId
   */
  async deleteFile(filename: string, folder?: string): Promise<boolean> {
    if (this.useCloudinary) {
      return this.deleteFromCloudinary(filename);
    } else {
      return this.deleteFromLocal(filename, folder);
    }
  }

  /**
   * Delete file from Cloudinary
   */
  private async deleteFromCloudinary(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  /**
   * Delete file from local storage
   */
  private async deleteFromLocal(filename: string, folder?: string): Promise<boolean> {
    try {
      const filePath = folder 
        ? path.join(this.uploadDir, folder, filename)
        : path.join(this.uploadDir, filename);
      
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * For development: handle base64 image fallback
   */
  async saveBase64Image(base64Data: string, folder?: string): Promise<UploadedFile> {
    // Extract mime type and data from base64 string
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 data');
    }

    const mimeType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    
    // Determine file extension from mime type
    const extensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    
    const extension = extensionMap[mimeType] || '.jpg';
    const filename = `${nanoid()}_${Date.now()}${extension}`;
    
    // Create subfolder if specified
    const targetDir = folder ? path.join(this.uploadDir, folder) : this.uploadDir;
    await fs.mkdir(targetDir, { recursive: true });
    
    const filePath = path.join(targetDir, filename);
    const relativePath = folder ? `${folder}/${filename}` : filename;

    // Write file to disk
    await fs.writeFile(filePath, imageBuffer);

    return {
      filename,
      originalName: `image${extension}`,
      mimeType,
      size: imageBuffer.length,
      url: `${this.baseUrl}/uploads/${relativePath}`,
    };
  }

  /**
   * Get file path for serving static files
   */
  getUploadDirectory(): string {
    return this.uploadDir;
  }
}

// Singleton instance
export const fileStorage = new FileStorageHandler();