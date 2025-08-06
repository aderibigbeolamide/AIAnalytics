import fetch from 'node-fetch';

const testRegistration = async () => {
  const eventId = '689237e6359507c3678a53b5'; // APW new event
  
  const registrationData = {
    registrationType: 'member',
    Fullname: 'John Test Doe',
    Email: 'john.test@example.com',
    PhoneNumber: '+1234567890',
    Gender: 'Male'
  };

  try {
    console.log('Testing registration for event:', eventId);
    console.log('Registration data:', registrationData);
    
    const response = await fetch(`http://localhost:5000/api/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData)
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (response.ok) {
      const parsedResult = JSON.parse(result);
      console.log('\n=== Registration Success ===');
      console.log('Registration ID:', parsedResult.registration?.id);
      console.log('Manual Verification Code should be generated and stored at root level');
      
      // Now test validation with admin token
      console.log('\n=== Testing Validation ===');
      const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password123' })
      });
      
      const loginResult = await loginResponse.json();
      if (loginResult.token) {
        console.log('Got admin token, testing validation...');
        
        // Test validation endpoint to see if registrations exist
        const checkResponse = await fetch(`http://localhost:5000/api/events/${eventId}/registrations`, {
          headers: { 'Authorization': `Bearer ${loginResult.token}` }
        });
        
        const registrations = await checkResponse.json();
        console.log('Current registrations count:', registrations.length);
        if (registrations.length > 0) {
          console.log('Latest registration manual code:', registrations[registrations.length - 1].manualVerificationCode || 'NOT SET');
        }
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testRegistration();