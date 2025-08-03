// Test validation by injecting into browser console
console.log('Testing QR validation system...');

// Simulate QR code validation with a test ID
async function testValidation(uniqueId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    console.log(`Testing validation with ID: ${uniqueId}`);
    
    const response = await fetch('/api/validate-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ uniqueId: uniqueId })
    });
    
    const result = await response.json();
    console.log('Validation result:', result);
    
    if (response.ok) {
      console.log('✅ Validation successful!');
      console.log('Details:', result);
    } else {
      console.log('❌ Validation failed:', result.message);
    }
    
    return result;
  } catch (error) {
    console.error('Error during validation:', error);
  }
}

// Test with some common unique ID patterns
const testIds = ['ABCDEF', 'YXNJYM', 'CBQFNZ'];
console.log('Available test IDs:', testIds);
console.log('Usage: testValidation("UNIQUE_ID")');

// Make function available globally
window.testValidation = testValidation;