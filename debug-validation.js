// Debug script to test validation directly in MongoDB
const { mongoStorage } = require('./server/mongodb-storage');

async function testValidation() {
    try {
        console.log('Testing validation system...');
        
        // Get all registrations
        const registrations = await mongoStorage.getEventRegistrations();
        console.log('Total registrations:', registrations.length);
        
        if (registrations.length > 0) {
            // Show first few registrations with their unique IDs
            registrations.slice(0, 5).forEach(reg => {
                console.log(`Registration: ${reg.firstName} ${reg.lastName}`);
                console.log(`  - Unique ID: ${reg.uniqueId}`);
                console.log(`  - QR Code: ${reg.qrCode}`);
                console.log(`  - Status: ${reg.status}`);
                console.log(`  - Event ID: ${reg.eventId}`);
                console.log('---');
            });
            
            // Test validation with first registration
            const testReg = registrations[0];
            console.log(`\nTesting validation with ID: ${testReg.uniqueId}`);
            
            const foundReg = await mongoStorage.getEventRegistrationByUniqueId(testReg.uniqueId);
            if (foundReg) {
                console.log('✅ Registration found by unique ID');
                console.log(`  Name: ${foundReg.firstName} ${foundReg.lastName}`);
                console.log(`  Status: ${foundReg.status}`);
                console.log(`  Event: ${foundReg.eventId}`);
            } else {
                console.log('❌ Registration NOT found by unique ID');
            }
        } else {
            console.log('No registrations found');
        }
        
    } catch (error) {
        console.error('Error testing validation:', error);
    }
}

testValidation();