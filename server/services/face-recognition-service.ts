import { RekognitionClient, DetectFacesCommand, CompareFacesCommand, CreateCollectionCommand, IndexFacesCommand, SearchFacesByImageCommand, DeleteFacesCommand, ListCollectionsCommand } from '@aws-sdk/client-rekognition';
import fs from 'fs';
import path from 'path';

export class FaceRecognitionService {
  private client: RekognitionClient | null = null;
  private collectionId: string = 'eventify-ai-faces';

  constructor() {
    // Check if AWS credentials are configured
    const isConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    
    if (isConfigured) {
      // Initialize AWS Rekognition client
      this.client = new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      // Initialize face collection on startup
      this.initializeCollection();
    } else {
      console.log('⚠️  AWS Face Recognition not configured - missing credentials');
    }
  }

  /**
   * Initialize the face collection for storing member faces
   */
  private async initializeCollection() {
    try {
      // Check if collection already exists
      const listCommand = new ListCollectionsCommand({});
      const collections = await this.client!.send(listCommand);
      
      const collectionExists = collections.CollectionIds?.includes(this.collectionId);
      
      if (!collectionExists) {
        const createCommand = new CreateCollectionCommand({
          CollectionId: this.collectionId,
        });
        
        await this.client!.send(createCommand);
        console.log(`✅ Face collection '${this.collectionId}' created successfully`);
      } else {
        console.log(`✅ Face collection '${this.collectionId}' already exists`);
      }
    } catch (error) {
      console.error('❌ Error initializing face collection:', error);
      console.log('⚠️  AWS Face Recognition will be disabled due to configuration issues');
      // Don't throw error - make it optional
      this.client = null;
    }
  }

  /**
   * Detect faces in an image and return face details
   * @param imageBuffer - Image buffer or file path
   * @returns Face detection results
   */
  async detectFaces(imageBuffer: Buffer | string): Promise<any> {
    if (!this.client) {
      return {
        success: false,
        error: 'AWS Face Recognition service is not configured. Please add AWS credentials to your environment.',
      };
    }

    try {
      let imageBytes: Buffer;
      
      if (typeof imageBuffer === 'string') {
        imageBytes = fs.readFileSync(imageBuffer);
      } else {
        imageBytes = imageBuffer;
      }

      const params = {
        Image: { Bytes: imageBytes },
        Attributes: ['ALL' as const], // Returns age, emotions, gender, etc.
      };

      const command = new DetectFacesCommand(params);
      const result = await this.client.send(command);

      return {
        success: true,
        faceCount: result.FaceDetails?.length || 0,
        faces: result.FaceDetails?.map((face, index) => ({
          faceId: index,
          confidence: face.Confidence,
          ageRange: face.AgeRange,
          gender: face.Gender,
          emotions: face.Emotions,
          boundingBox: face.BoundingBox,
        })),
      };
    } catch (error) {
      console.error('Error detecting faces:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Compare two faces to see if they match
   * @param sourceImage - Reference image buffer
   * @param targetImage - Image to compare against
   * @param threshold - Similarity threshold (default: 85%)
   * @returns Comparison results
   */
  async compareFaces(sourceImage: Buffer | string, targetImage: Buffer | string, threshold: number = 85): Promise<any> {
    if (!this.client) {
      return {
        success: false,
        error: 'AWS Face Recognition service is not configured. Please add AWS credentials to your environment.',
      };
    }

    try {
      let sourceBytes: Buffer;
      let targetBytes: Buffer;

      if (typeof sourceImage === 'string') {
        sourceBytes = fs.readFileSync(sourceImage);
      } else {
        sourceBytes = sourceImage;
      }

      if (typeof targetImage === 'string') {
        targetBytes = fs.readFileSync(targetImage);
      } else {
        targetBytes = targetImage;
      }

      const params = {
        SourceImage: { Bytes: sourceBytes },
        TargetImage: { Bytes: targetBytes },
        SimilarityThreshold: threshold,
      };

      const command = new CompareFacesCommand(params);
      const result = await this.client.send(command);

      const matches = result.FaceMatches || [];
      
      return {
        success: true,
        isMatch: matches.length > 0,
        similarity: matches.length > 0 ? matches[0].Similarity : 0,
        confidence: matches.length > 0 ? matches[0].Face?.Confidence : 0,
        matchCount: matches.length,
        threshold,
      };
    } catch (error) {
      console.error('Error comparing faces:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Register a new face in the system (index face)
   * @param imageBuffer - Image buffer containing the face
   * @param userId - Unique identifier for the person
   * @param additionalData - Additional metadata about the person
   * @returns Registration results
   */
  async registerFace(imageBuffer: Buffer | string, userId: string, additionalData?: any): Promise<any> {
    if (!this.client) {
      return {
        success: false,
        error: 'AWS Face Recognition service is not configured. Please add AWS credentials to your environment.',
      };
    }

    try {
      let imageBytes: Buffer;
      
      if (typeof imageBuffer === 'string') {
        imageBytes = fs.readFileSync(imageBuffer);
      } else {
        imageBytes = imageBuffer;
      }

      const params = {
        CollectionId: this.collectionId,
        Image: { Bytes: imageBytes },
        ExternalImageId: userId,
        MaxFaces: 1,
        QualityFilter: 'AUTO' as const,
      };

      const command = new IndexFacesCommand(params);
      const result = await this.client.send(command);

      if (result.FaceRecords && result.FaceRecords.length > 0) {
        const faceRecord = result.FaceRecords[0];
        
        return {
          success: true,
          faceId: faceRecord.Face?.FaceId,
          userId,
          confidence: faceRecord.Face?.Confidence,
          boundingBox: faceRecord.Face?.BoundingBox,
          additionalData,
        };
      } else {
        return {
          success: false,
          error: 'No face detected in the image',
        };
      }
    } catch (error) {
      console.error('Error registering face:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Search for a matching face in the registered faces
   * @param imageBuffer - Image buffer to search with
   * @param threshold - Similarity threshold (default: 85%)
   * @returns Search results with matching faces
   */
  async searchFace(imageBuffer: Buffer | string, threshold: number = 85): Promise<any> {
    if (!this.client) {
      return {
        success: false,
        error: 'AWS Face Recognition service is not configured. Please add AWS credentials to your environment.',
      };
    }

    try {
      let imageBytes: Buffer;
      
      if (typeof imageBuffer === 'string') {
        imageBytes = fs.readFileSync(imageBuffer);
      } else {
        imageBytes = imageBuffer;
      }

      const params = {
        CollectionId: this.collectionId,
        Image: { Bytes: imageBytes },
        MaxFaces: 5,
        FaceMatchThreshold: threshold,
      };

      const command = new SearchFacesByImageCommand(params);
      const result = await this.client.send(command);

      const matches = result.FaceMatches || [];

      return {
        success: true,
        matchFound: matches.length > 0,
        matches: matches.map(match => ({
          userId: match.Face?.ExternalImageId,
          faceId: match.Face?.FaceId,
          similarity: match.Similarity,
          confidence: match.Face?.Confidence,
        })),
        searchedFaceCount: result.FaceMatches ? result.FaceMatches.length : 0,
        threshold,
      };
    } catch (error) {
      console.error('Error searching face:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete a registered face from the collection
   * @param faceId - Face ID to delete
   * @returns Deletion results
   */
  async deleteFace(faceId: string): Promise<any> {
    try {
      const params = {
        CollectionId: this.collectionId,
        FaceIds: [faceId],
      };

      const command = new DeleteFacesCommand(params);
      const result = await this.client!.send(command);

      return {
        success: true,
        deletedFaces: result.DeletedFaces || [],
      };
    } catch (error) {
      console.error('Error deleting face:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate that an uploaded image is suitable for face recognition
   * @param imageBuffer - Image buffer to validate
   * @returns Validation results
   */
  async validateImage(imageBuffer: Buffer): Promise<any> {
    try {
      // Check file size (AWS limit is 5MB for direct upload)
      if (imageBuffer.length > 5 * 1024 * 1024) {
        return {
          success: false,
          error: 'Image file size exceeds 5MB limit',
        };
      }

      // Detect faces to validate the image
      const faceDetection = await this.detectFaces(imageBuffer);
      
      if (!faceDetection.success) {
        return faceDetection;
      }

      if (faceDetection.faceCount === 0) {
        return {
          success: false,
          error: 'No face detected in the image',
        };
      }

      if (faceDetection.faceCount > 1) {
        return {
          success: false,
          error: 'Multiple faces detected. Please use an image with only one person.',
        };
      }

      const face = faceDetection.faces[0];
      
      // Check face confidence (minimum 80%)
      if (face.confidence < 80) {
        return {
          success: false,
          error: 'Face detection confidence is too low. Please use a clearer image.',
        };
      }

      return {
        success: true,
        message: 'Image is suitable for face recognition',
        faceDetails: face,
      };
    } catch (error) {
      console.error('Error validating image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get service status and configuration
   * @returns Service status
   */
  getStatus(): any {
    return {
      service: 'AWS Rekognition Face Recognition',
      collectionId: this.collectionId,
      region: process.env.AWS_REGION || 'us-east-1',
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    };
  }
}

// Export singleton instance
export const faceRecognitionService = new FaceRecognitionService();