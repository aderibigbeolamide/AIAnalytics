import mongoose from 'mongoose';
import fs from 'fs';
import FormData from 'form-data';

const testValidation = async () => {
  try {
    // Test the validation endpoint directly
    const formData = new FormData();
    const imageBuffer = fs.readFileSync('./uploads/face_photos_musodiq_test.jpeg');
    
    formData.append('image', imageBuffer, {
      filename: 'test-face.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('eventId', '68acdfae1db767e5bab1dde4');

    console.log('🧪 Testing face validation endpoint...');
    console.log('Event ID being sent:', '68acdfae1db767e5bab1dde4');
    console.log('Image size:', imageBuffer.length, 'bytes');

    // Make the API call
    const response = await fetch('http://localhost:5000/api/face-recognition/validate-attendance', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ODYyYmZlMWU3ZjgxZTFhNmM3YzA1MSIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6InN1cGVyYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJvcmdhbml6YXRpb25JZCI6IjY4ODYyYzNmMWU3ZjgxZTFhNmM3YzA1NSIsImlhdCI6MTc1NjI2NzAzOCwiZXhwIjoxNzU2MjcwNjM4fQ.jjcOWZKOTb5b-FQnVYLKqnZr3MrwJ1fNGpLsm6e-aWQ',
        ...formData.getHeaders()
      },
      body: formData
    });

    const result = await response.json();
    
    console.log('\n=== API Response ===');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.debug) {
      console.log('\n=== Debug Info ===');
      console.log('Matched Event ID:', result.debug.matchedEventId);
      console.log('Requested Event ID:', result.debug.requestedEventId);
      console.log('Matched User:', result.debug.matchedUser);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
};

testValidation();