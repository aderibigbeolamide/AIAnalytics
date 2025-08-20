import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Eye, Users } from 'lucide-react';

export function FaceRecognitionTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setResult(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const testDetectFaces = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const response = await fetch('/api/face-recognition/detect', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to detect faces');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const testValidateImage = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const response = await fetch('/api/face-recognition/validate-image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to validate image');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkServiceStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/face-recognition/status');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to check service status');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            AWS Face Recognition Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Service Status */}
          <div className="flex gap-4">
            <Button 
              onClick={checkServiceStatus} 
              disabled={isLoading}
              variant="outline"
            >
              <Users className="h-4 w-4 mr-2" />
              Check Service Status
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="face-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
                  <Upload className="h-4 w-4" />
                  Upload Image
                </div>
                <input
                  id="face-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              
              {selectedFile && (
                <Badge variant="secondary">
                  {selectedFile.name}
                </Badge>
              )}
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="border rounded-lg p-4">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-w-xs max-h-64 object-contain mx-auto"
                />
              </div>
            )}
          </div>

          {/* Test Buttons */}
          {selectedFile && (
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={testDetectFaces} 
                disabled={isLoading}
              >
                <Eye className="h-4 w-4 mr-2" />
                Detect Faces
              </Button>
              
              <Button 
                onClick={testValidateImage} 
                disabled={isLoading}
                variant="outline"
              >
                <Camera className="h-4 w-4 mr-2" />
                Validate Image Quality
              </Button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <Alert>
              <AlertDescription>
                Processing... This may take a few seconds.
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
                
                {/* Formatted Results for Face Detection */}
                {result.success && result.faceCount !== undefined && (
                  <div className="mt-4 space-y-2">
                    <p className="font-medium">
                      Found {result.faceCount} face(s) in the image
                    </p>
                    {result.faces?.map((face: any, index: number) => (
                      <div key={index} className="bg-blue-50 p-3 rounded-md">
                        <p><strong>Face {index + 1}:</strong></p>
                        <p>Confidence: {face.confidence?.toFixed(1)}%</p>
                        {face.ageRange && (
                          <p>Age: {face.ageRange.Low} - {face.ageRange.High} years</p>
                        )}
                        {face.gender && (
                          <p>Gender: {face.gender.Value} ({face.gender.Confidence?.toFixed(1)}%)</p>
                        )}
                        {face.emotions && face.emotions.length > 0 && (
                          <p>Top Emotion: {face.emotions[0].Type} ({face.emotions[0].Confidence?.toFixed(1)}%)</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Service Status Display */}
                {result.service && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.configured ? "default" : "secondary"}>
                        {result.configured ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                    <p><strong>Service:</strong> {result.service}</p>
                    <p><strong>Region:</strong> {result.region}</p>
                    <p><strong>Collection:</strong> {result.collectionId}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>1. Check Service Status:</strong> First, check if AWS credentials are configured
              </div>
              <div>
                <strong>2. Upload Image:</strong> Choose a JPEG or PNG image with clear faces
              </div>
              <div>
                <strong>3. Detect Faces:</strong> Test AWS face detection capabilities
              </div>
              <div>
                <strong>4. Validate Quality:</strong> Check if image is suitable for face recognition
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <strong>Note:</strong> If service shows "Not Configured", you need to add AWS credentials to your environment variables.
                See the AWS_FACE_RECOGNITION_SETUP.md guide for details.
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}